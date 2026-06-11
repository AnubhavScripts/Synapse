from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.customer import Customer
from app.models.persona import CustomerPersona
from app.models.campaign import Campaign
from app.schemas.analytics import AnalyticsOverview, ChannelPerformance

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count(Customer.id)))).scalar() or 0
    total_revenue = (await db.execute(select(func.sum(Customer.total_spend)))).scalar() or 0
    avg_ltv = (await db.execute(select(func.avg(Customer.lifetime_value)))).scalar() or 0

    # Active = loyal + stable
    active = 0
    dormant = 0
    for risk, label in [("loyal", "active"), ("stable", "active"), ("at_risk", "active"), ("dormant", "dormant"), ("churned", "dormant")]:
        count = (await db.execute(
            select(func.count(CustomerPersona.id)).where(CustomerPersona.risk_level == risk)
        )).scalar() or 0
        if label == "active" and risk != "at_risk":
            active += count
        elif risk == "at_risk":
            active += count
        else:
            dormant += count

    orders = (await db.execute(select(func.sum(Customer.order_count)))).scalar() or 0
    active_campaigns = (await db.execute(
        select(func.count(Campaign.id)).where(Campaign.status.in_(["queued", "processing", "sending"]))
    )).scalar() or 0

    # Revenue influenced by campaigns
    revenue_influenced = (await db.execute(
        select(func.sum(Campaign.actual_revenue)).where(Campaign.status == "completed")
    )).scalar() or 0

    # Campaign ROI
    total_predicted = (await db.execute(
        select(func.sum(Campaign.predicted_revenue)).where(Campaign.status == "completed")
    )).scalar() or 1
    campaign_roi = round((revenue_influenced / max(total_predicted, 1)) * 100, 1)

    # Conversion rate
    total_sent = (await db.execute(
        select(func.sum(Campaign.actual_sent)).where(Campaign.status == "completed")
    )).scalar() or 1
    total_converted = (await db.execute(
        select(func.sum(Campaign.actual_converted)).where(Campaign.status == "completed")
    )).scalar() or 0
    conversion_rate = round((total_converted / max(total_sent, 1)) * 100, 1)

    # Read rate
    total_delivered = (await db.execute(
        select(func.sum(Campaign.actual_delivered)).where(Campaign.status == "completed")
    )).scalar() or 1
    total_read = (await db.execute(
        select(func.sum(Campaign.actual_read)).where(Campaign.status == "completed")
    )).scalar() or 0
    read_rate = round((total_read / max(total_delivered, 1)) * 100, 1)

    # Retention (loyal / total * 100)
    loyal_count = (await db.execute(
        select(func.count(CustomerPersona.id)).where(CustomerPersona.risk_level == "loyal")
    )).scalar() or 0
    retention_rate = round((loyal_count / max(total, 1)) * 100, 1)

    return AnalyticsOverview(
        total_customers=total,
        active_customers=active,
        dormant_customers=dormant,
        total_revenue=total_revenue,
        orders_this_month=orders,
        active_campaigns=active_campaigns,
        avg_customer_ltv=round(avg_ltv, 2),
        revenue_influenced=revenue_influenced,
        campaign_roi=campaign_roi,
        conversion_rate=conversion_rate,
        read_rate=read_rate,
        retention_rate=retention_rate,
    )


@router.get("/channels", response_model=list[ChannelPerformance])
async def get_channel_performance(db: AsyncSession = Depends(get_db)):
    channels = ["whatsapp", "sms", "email", "rcs"]
    result = []
    for ch in channels:
        campaigns = (await db.execute(
            select(Campaign).where(Campaign.channel == ch, Campaign.status == "completed")
        )).scalars().all()

        if not campaigns:
            result.append(ChannelPerformance(
                channel=ch, delivery_rate=0, read_rate=0, click_rate=0,
                conversion_rate=0, revenue=0, campaigns_count=0
            ))
            continue

        total_sent = sum(c.actual_sent for c in campaigns) or 1
        total_delivered = sum(c.actual_delivered for c in campaigns)
        total_read = sum(c.actual_read for c in campaigns)
        total_clicked = sum(c.actual_clicked for c in campaigns)
        total_converted = sum(c.actual_converted for c in campaigns)
        total_revenue = sum(c.actual_revenue for c in campaigns)

        result.append(ChannelPerformance(
            channel=ch,
            delivery_rate=round(total_delivered / max(total_sent, 1) * 100, 1),
            read_rate=round(total_read / max(total_delivered, 1) * 100, 1),
            click_rate=round(total_clicked / max(total_read, 1) * 100, 1),
            conversion_rate=round(total_converted / max(total_sent, 1) * 100, 1),
            revenue=total_revenue,
            campaigns_count=len(campaigns),
        ))
    return result


@router.get("/audiences")
async def get_audience_performance(db: AsyncSession = Depends(get_db)):
    """Segment performance comparison."""
    from app.models.segment import Segment
    segments = (await db.execute(
        select(Segment).order_by(Segment.revenue_contribution.desc()).limit(7)
    )).scalars().all()

    return [
        {
            "name": s.name,
            "customer_count": s.customer_count,
            "revenue": s.revenue_contribution,
            "engagement_rate": s.engagement_rate,
            "growth_trend": s.growth_trend,
        }
        for s in segments
    ]
