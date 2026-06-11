"""
Campaign Service — Campaign lifecycle management.
"""

import asyncio
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.campaign import Campaign
from app.models.activity import Activity
from app.services.channel_simulator import simulate_campaign


async def launch_campaign(campaign_id: UUID, session: AsyncSession) -> Campaign:
    """Launch a campaign and trigger the channel simulator."""
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise ValueError("Campaign not found")

    if campaign.status not in ("draft", "queued"):
        raise ValueError(f"Campaign cannot be launched from status: {campaign.status}")

    # Update to queued
    campaign.status = "queued"
    campaign.launched_at = datetime.now(timezone.utc)

    # Create activity
    session.add(Activity(
        campaign_id=campaign_id,
        event_type="campaign_queued",
        channel=campaign.channel,
        status="info",
        description=f"Campaign '{campaign.name}' queued for processing.",
        affected_count=campaign.predicted_reach,
    ))

    await session.commit()
    await session.refresh(campaign)

    # Launch simulator in background
    asyncio.create_task(simulate_campaign(campaign_id))

    return campaign
