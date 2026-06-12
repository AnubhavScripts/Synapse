"""
Campaigns API — CRM Service A

Handles campaign CRUD, launch, and the webhook callback endpoint that
receives events from the Messaging Gateway (Service B).

Callback Flow:
  1. POST /api/campaigns/callback  ← called by Gateway
     a. Try INSERT callback_events (unique callback_id = idempotency)
     b. On IntegrityError (duplicate) → return 200 immediately
     c. Return 202 Accepted
     d. Background task: process_callback_event(event.id)
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.activity import Activity
from app.models.callback_event import CallbackEvent
from app.models.campaign import Campaign
from app.models.campaign_message import CampaignMessage
from app.models.customer import Customer
from app.models.decision_log import DecisionLog
from app.schemas.analytics import ActivityOut, DecisionLogOut
from app.schemas.campaign import CampaignCreateRequest, CampaignFunnelOut, CampaignOut, CampaignTimelineEvent
from app.services.callback_processor import process_callback_event
from app.services.campaign_service import launch_campaign

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])


# ── Campaign CRUD ─────────────────────────────────────────────────────────────

@router.get("", response_model=list[CampaignOut])
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Campaign).order_by(Campaign.created_at.desc())
    )
    campaigns = result.scalars().all()
    out = []
    for c in campaigns:
        item = CampaignOut.model_validate(c)
        if c.segment:
            item.segment_name = c.segment.name
        out.append(item)
    return out


@router.get("/{campaign_id}", response_model=CampaignOut)
async def get_campaign(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    item = CampaignOut.model_validate(campaign)
    if campaign.segment:
        item.segment_name = campaign.segment.name
    return item


@router.post("", response_model=CampaignOut)
async def create_campaign(request: CampaignCreateRequest, db: AsyncSession = Depends(get_db)):
    campaign = Campaign(
        name=request.name,
        goal=request.goal,
        segment_id=request.segment_id,
        channel=request.channel,
        status="draft",
        message_headline=request.message_headline,
        message_body=request.message_body,
        message_cta=request.message_cta,
        ai_strategy=request.ai_strategy,
        predicted_reach=request.predicted_reach,
        predicted_opens=request.predicted_opens,
        predicted_clicks=request.predicted_clicks,
        predicted_conversions=request.predicted_conversions,
        predicted_revenue=request.predicted_revenue,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    item = CampaignOut.model_validate(campaign)
    if campaign.segment:
        item.segment_name = campaign.segment.name
    return item


@router.post("/{campaign_id}/launch", response_model=CampaignOut)
async def launch(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        campaign = await launch_campaign(campaign_id, db)
        item = CampaignOut.model_validate(campaign)
        if campaign.segment:
            item.segment_name = campaign.segment.name
        return item
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{campaign_id}/funnel", response_model=CampaignFunnelOut)
async def get_funnel(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignFunnelOut(
        queued=campaign.predicted_reach,
        sent=campaign.actual_sent,
        delivered=campaign.actual_delivered,
        read=campaign.actual_read,
        clicked=campaign.actual_clicked,
        converted=campaign.actual_converted,
        failed=campaign.actual_failed,
    )


@router.get("/{campaign_id}/timeline", response_model=list[CampaignTimelineEvent])
async def get_timeline(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    # 1. Fetch Campaign details
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    events = []

    # ── CRM Event: Campaign Created ──
    events.append(CampaignTimelineEvent(
        id=f"crm-created-{campaign.id}",
        timestamp=campaign.created_at,
        service="crm",
        event_type="campaign_created",
        title="Campaign Created",
        description=f"Campaign '{campaign.name}' was created as a {campaign.status}.",
        status="success",
        metadata={"goal": campaign.goal, "channel": campaign.channel}
    ))

    # ── CRM Event: Dispatch Request Sent ──
    if campaign.launched_at:
        events.append(CampaignTimelineEvent(
            id=f"crm-dispatched-{campaign.id}",
            timestamp=campaign.launched_at,
            service="crm",
            event_type="dispatch_sent",
            title="Dispatch Request Sent",
            description=f"Campaign payload sent to Messaging Gateway at http://localhost:8001/gateway/dispatch",
            status="success" if campaign.status != "dispatch_failed" else "failed",
            metadata={"channel": campaign.channel}
        ))

    # 2. Fetch Activities (CRM service)
    activities_result = await db.execute(
        select(Activity)
        .where(Activity.campaign_id == campaign_id)
    )
    activities = activities_result.scalars().all()
    for a in activities:
        title = "CRM Activity"
        status_str = "success"
        if a.event_type == "campaign_queued":
            title = "Campaign Messages Generated"
        elif a.event_type == "dispatch_failed":
            title = "Dispatch Request Failed"
            status_str = "failed"
        elif a.event_type == "campaign_completed":
            title = "Campaign Completed"
        elif a.event_type == "message_converted":
            title = "Message Converted"
        elif a.event_type == "message_failed":
            title = "Message Delivery Failed"
            status_str = "failed"

        events.append(CampaignTimelineEvent(
            id=f"crm-activity-{a.id}",
            timestamp=a.created_at,
            service="crm",
            event_type=a.event_type,
            title=title,
            description=a.description,
            status=status_str,
            metadata={"affected_count": a.affected_count}
        ))

    # 3. Fetch Dispatch Jobs (Gateway service)
    from app.models.dispatch_job import DispatchJob
    jobs_result = await db.execute(
        select(DispatchJob)
        .where(DispatchJob.campaign_id == campaign_id)
    )
    jobs = jobs_result.scalars().all()
    for job in jobs:
        # A. Job Accepted
        events.append(CampaignTimelineEvent(
            id=f"gateway-accepted-{job.id}",
            timestamp=job.created_at,
            service="gateway",
            event_type="job_accepted",
            title="Dispatch Job Accepted",
            description=f"Gateway accepted campaign dispatch job with {job.total_messages} messages.",
            status="success",
            metadata={"job_id": str(job.id)}
        ))

        # B. Started Processing
        if job.status in ("processing", "completed", "failed"):
            events.append(CampaignTimelineEvent(
                id=f"gateway-processing-start-{job.id}",
                timestamp=job.created_at + timedelta(seconds=1),
                service="gateway",
                event_type="processing_start",
                title="Gateway Started Processing",
                description="Gateway initialized batch dispatcher and concurrency queue.",
                status="success"
            ))

            # C. Batch Processing Events
            total_batches = (job.total_messages - 1) // 10 + 1
            for batch_index in range(total_batches):
                batch_time = job.created_at + timedelta(seconds=2 + batch_index * 1.5)
                if job.status in ("completed", "failed") and batch_time > job.updated_at:
                    batch_time = job.updated_at - timedelta(milliseconds=500 - batch_index * 10)

                events.append(CampaignTimelineEvent(
                    id=f"gateway-batch-{job.id}-{batch_index}",
                    timestamp=batch_time,
                    service="gateway",
                    event_type="batch_processing",
                    title=f"Processing Batch {batch_index + 1}",
                    description=f"Gateway dispatching batch of {min(10, job.total_messages - batch_index * 10)} messages concurrently.",
                    status="success" if (job.status == "completed" or job.processed_messages > batch_index * 10) else "processing"
                ))

        # D. Dispatch Completed/Failed
        if job.status == "completed":
            events.append(CampaignTimelineEvent(
                id=f"gateway-completed-{job.id}",
                timestamp=job.updated_at,
                service="gateway",
                event_type="dispatch_completed",
                title="Dispatch Completed",
                description=f"All {job.total_messages} messages successfully simulated and dispatched.",
                status="success"
            ))
        elif job.status == "failed":
            events.append(CampaignTimelineEvent(
                id=f"gateway-failed-{job.id}",
                timestamp=job.updated_at,
                service="gateway",
                event_type="dispatch_failed",
                title="Dispatch Job Failed",
                description=f"Gateway job execution aborted: {job.error}",
                status="failed"
            ))

    # 4. Fetch Callback Events (Callback service)
    callbacks_result = await db.execute(
        select(CallbackEvent)
        .join(CampaignMessage, CallbackEvent.message_id == CampaignMessage.id)
        .where(CampaignMessage.campaign_id == campaign_id)
    )
    callbacks = callbacks_result.scalars().all()
    for cb in callbacks:
        status_str = "success"
        if cb.status == "pending":
            status_str = "processing"
        elif cb.status in ("failed", "permanently_failed"):
            status_str = "failed"

        # A. Callback Received Event
        events.append(CampaignTimelineEvent(
            id=f"callback-event-{cb.id}",
            timestamp=cb.created_at,
            service="callback",
            event_type=f"callback_{cb.event_type}",
            title=f"Callback Received → {cb.event_type.upper()}",
            description=(
                f"Revenue of ₹{cb.details.get('revenue', 0.0):,.2f} registered for message."
                if cb.event_type == "converted" else
                f"Error registered: {cb.details.get('error_message')}"
                if cb.event_type == "failed" else
                f"Message state updated to {cb.event_type}."
            ),
            status=status_str,
            metadata={"callback_id": cb.callback_id, "message_id": str(cb.message_id)}
        ))

        # B. Retry Attempt Triggered (if any)
        if cb.retry_count > 0:
            for attempt in range(1, cb.retry_count + 1):
                events.append(CampaignTimelineEvent(
                    id=f"callback-retry-{cb.id}-{attempt}",
                    timestamp=cb.created_at + timedelta(seconds=5 * attempt),
                    service="callback",
                    event_type="callback_retry",
                    title=f"Callback Retry Attempt {attempt}",
                    description=f"Retrying callback {cb.callback_id} (Attempt {attempt}). Last error: {cb.last_error}",
                    status="failed" if attempt < cb.retry_count or cb.status in ("failed", "permanently_failed") else "success",
                    metadata={"callback_id": cb.callback_id, "attempt": attempt}
                ))

        # 5. Synthesize Analytics Events (when metrics update)
        if cb.status == "processed":
            analytics_time = cb.created_at + timedelta(milliseconds=100)
            events.append(CampaignTimelineEvent(
                id=f"analytics-update-{cb.id}",
                timestamp=analytics_time,
                service="analytics",
                event_type="metrics_updated",
                title="Campaign Metrics Updated",
                description=(
                    f"Revenue metrics updated: +₹{cb.details.get('revenue', 0.0):,.2f} revenue registered."
                    if cb.event_type == "converted" else
                    f"Metrics incremented: +1 {cb.event_type} in CRM Analytics Engine."
                ),
                status="success",
                metadata={"event_type": cb.event_type}
            ))

    # C. Campaign Finalized Event (Analytics service)
    if campaign.status == "completed" and campaign.completed_at:
        events.append(CampaignTimelineEvent(
            id=f"analytics-finalized-{campaign.id}",
            timestamp=campaign.completed_at,
            service="analytics",
            event_type="campaign_finalized",
            title="Campaign Finalized",
            description="All message lifecycle metrics aggregated. Final campaign reports generated.",
            status="success"
        ))

    # 6. Sort all events by timestamp ascending
    events.sort(key=lambda x: x.timestamp)
    return events


@router.get("/{campaign_id}/decisions", response_model=list[DecisionLogOut])
async def get_campaign_decisions(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DecisionLog)
        .where(DecisionLog.campaign_id == campaign_id)
        .order_by(DecisionLog.created_at.desc())
        .limit(50)
    )
    decisions = result.scalars().all()
    out = []
    for d in decisions:
        item = DecisionLogOut.model_validate(d)
        if d.customer:
            item.customer_name = d.customer.name
        out.append(item)
    return out


@router.get("/{campaign_id}/messages")
async def get_campaign_messages(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CampaignMessage, Customer.name)
        .join(Customer, CampaignMessage.customer_id == Customer.id)
        .where(CampaignMessage.campaign_id == campaign_id)
        .order_by(CampaignMessage.created_at.asc())
    )
    rows = result.all()
    return [
        {
            "id": str(msg.id),
            "campaign_id": str(msg.campaign_id),
            "customer_id": str(msg.customer_id),
            "customer_name": name,
            "channel": msg.channel,
            "status": msg.status,
            "sequence": msg.sequence,
            "history": msg.history or [],
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "updated_at": msg.updated_at.isoformat() if msg.updated_at else None,
        }
        for msg, name in rows
    ]


# ── Webhook Callback Handler ──────────────────────────────────────────────────

class _CallbackDetails(BaseModel):
    revenue: float = 0.0
    error_message: str | None = None


class WebhookCallbackRequest(BaseModel):
    """
    Payload sent by the Messaging Gateway for each lifecycle event.
    callback_id must be globally unique — used as the idempotency key.
    sequence_number must be strictly increasing per message.
    """
    callback_id: str
    message_id: UUID
    event_type: str        # sent|delivered|read|clicked|converted|failed|expired
    sequence_number: int
    details: _CallbackDetails = _CallbackDetails()


@router.post("/callback", status_code=202)
async def callback_handler(
    req: WebhookCallbackRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook receipt handler — called by the Messaging Gateway.

    Persistence-first design (Requirement #6):
      Every callback is written to callback_events BEFORE any processing.
      This guarantees durability even if the background processor crashes.

    Idempotency (Requirement #7):
      The UNIQUE constraint on callback_events.callback_id means a duplicate
      delivery from the Gateway causes an IntegrityError which we catch and
      return immediately — no double-processing.

    Fix #5 — Sequence guard is enforced inside process_callback_event,
    not here, so we always persist the raw event for audit purposes.
    """
    try:
        event = CallbackEvent(
            id=uuid.uuid4(),
            callback_id=req.callback_id,
            message_id=req.message_id,
            event_type=req.event_type,
            sequence_number=req.sequence_number,
            details={
                "revenue": req.details.revenue,
                "error_message": req.details.error_message,
            },
            status="pending",
        )
        db.add(event)
        await db.commit()
        event_id = event.id

        logger.debug(
            "[CRM] Callback received — id=%s type=%s message=%s seq=%d",
            req.callback_id, req.event_type, req.message_id, req.sequence_number,
        )

    except IntegrityError:
        # Duplicate callback_id — already processed or in-flight
        await db.rollback()
        logger.debug("[CRM] Duplicate callback ignored: %s", req.callback_id)
        return {"status": "duplicate", "detail": "Callback already received"}

    # Kick off processing asynchronously — response is already committed above
    background_tasks.add_task(process_callback_event, event_id)
    return {"status": "accepted", "event_id": str(event_id)}
