from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.campaign import Campaign
from app.models.segment import Segment
from app.models.activity import Activity
from app.models.decision_log import DecisionLog
from app.schemas.campaign import CampaignOut, CampaignCreateRequest, CampaignFunnelOut
from app.schemas.analytics import ActivityOut, DecisionLogOut
from app.services.campaign_service import launch_campaign
from uuid import UUID

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])


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


@router.get("/{campaign_id}/timeline", response_model=list[ActivityOut])
async def get_timeline(campaign_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Activity)
        .where(Activity.campaign_id == campaign_id)
        .order_by(Activity.created_at.asc())
    )
    activities = result.scalars().all()
    out = []
    for a in activities:
        item = ActivityOut.model_validate(a)
        if a.campaign:
            item.campaign_name = a.campaign.name
        out.append(item)
    return out


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
