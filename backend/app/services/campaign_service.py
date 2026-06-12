"""
Campaign Service — CRM Side

Handles campaign launch: pre-creates CampaignMessage rows, then dispatches
to the Messaging Gateway via HTTP. If the Gateway is unreachable the campaign
is marked 'dispatch_failed' rather than silently losing it (Fix #1).
"""

import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID, uuid4

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import async_session
from app.models.campaign import Campaign
from app.models.activity import Activity
from app.models.segment import SegmentMembership
from app.models.campaign_message import CampaignMessage
from app.models.customer import Customer

logger = logging.getLogger(__name__)

GATEWAY_DISPATCH_URL = "http://localhost:8001/gateway/dispatch"
GATEWAY_TIMEOUT = 10.0   # seconds — generous to allow Gateway startup latency


async def launch_campaign(campaign_id: UUID, session: AsyncSession) -> Campaign:
    """
    Launches a campaign:
      1. Identifies target customers (from segment or fallback pool).
      2. Pre-creates CampaignMessage records in 'queued' state.
      3. Sets campaign status to 'sending' and commits.
      4. Fires a background task to POST to the Messaging Gateway.
         If the Gateway call fails the campaign is updated to 'dispatch_failed'.
    """
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise ValueError("Campaign not found")

    if campaign.status not in ("draft", "queued"):
        raise ValueError(f"Campaign cannot be launched from status: {campaign.status}")

    # ── 1. Identify Target Audience ───────────────────────────────────────────
    if campaign.segment_id:
        members_result = await session.execute(
            select(SegmentMembership.customer_id).where(
                SegmentMembership.segment_id == campaign.segment_id
            )
        )
        customer_ids = [row[0] for row in members_result.all()]
    else:
        customer_ids = []

    if not customer_ids:
        cust_res = await session.execute(select(Customer.id).limit(15))
        customer_ids = [row[0] for row in cust_res.all()]

    # ── 2. Pre-create CampaignMessage records ─────────────────────────────────
    messages = []
    now_str = datetime.now(timezone.utc).isoformat()
    for cid in customer_ids:
        msg = CampaignMessage(
            id=uuid4(),
            campaign_id=campaign_id,
            customer_id=cid,
            channel=campaign.channel,
            status="queued",
            sequence=0,
            history=[{"status": "queued", "at": now_str}],
        )
        session.add(msg)
        messages.append(msg)

    # ── 3. Update campaign state ──────────────────────────────────────────────
    campaign.status = "sending"
    campaign.launched_at = datetime.now(timezone.utc)
    campaign.actual_sent = 0
    campaign.actual_delivered = 0
    campaign.actual_read = 0
    campaign.actual_clicked = 0
    campaign.actual_converted = 0
    campaign.actual_failed = 0
    campaign.actual_revenue = 0.0

    session.add(Activity(
        campaign_id=campaign_id,
        event_type="campaign_queued",
        channel=campaign.channel,
        status="info",
        description=(
            f"Campaign '{campaign.name}' launched. "
            f"{len(messages)} messages queued for dispatch."
        ),
        affected_count=len(messages),
    ))

    await session.commit()
    await session.refresh(campaign)

    # ── 4. Dispatch to Messaging Gateway (background, non-blocking) ───────────
    dispatch_payload = {
        "campaign_id": str(campaign_id),
        "channel": campaign.channel,
        "messages": [
            {"message_id": str(m.id), "customer_id": str(m.customer_id)}
            for m in messages
        ],
    }
    # Schedule the HTTP call as a background task so the launch endpoint
    # returns immediately. The task updates campaign to 'dispatch_failed'
    # if the Gateway is unreachable (Fix #1).
    asyncio.create_task(
        _dispatch_to_gateway(campaign_id, dispatch_payload)
    )

    return campaign


async def _dispatch_to_gateway(campaign_id: UUID, payload: dict) -> None:
    """
    Posts the dispatch payload to the Messaging Gateway.

    Fix #1 — Not fire-and-forget:
    If the Gateway is down or returns a 5xx, the campaign is marked
    'dispatch_failed' and an activity log is written. This prevents silent
    data loss where a campaign appears to launch but messages are never sent.
    """
    try:
        async with httpx.AsyncClient(timeout=GATEWAY_TIMEOUT) as client:
            response = await client.post(GATEWAY_DISPATCH_URL, json=payload)
            response.raise_for_status()

        logger.info(
            "[CRM] Dispatch accepted by Gateway for campaign %s (%d messages)",
            campaign_id, len(payload.get("messages", [])),
        )

    except Exception as exc:
        logger.error(
            "[CRM] Gateway unreachable for campaign %s — marking dispatch_failed: %s",
            campaign_id, exc,
        )
        # Open a fresh session — the launch session is already committed/closed
        async with async_session() as db:
            campaign = await db.get(Campaign, campaign_id)
            if campaign and campaign.status == "sending":
                campaign.status = "dispatch_failed"
                db.add(campaign)
                db.add(Activity(
                    campaign_id=campaign_id,
                    event_type="dispatch_failed",
                    channel=campaign.channel,
                    status="error",
                    description=(
                        f"Messaging Gateway unreachable. Campaign dispatch failed: {exc}"
                    ),
                    affected_count=0,
                ))
                await db.commit()
