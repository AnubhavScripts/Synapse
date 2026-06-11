from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.activity import Activity
from app.schemas.analytics import ActivityOut

router = APIRouter(prefix="/api/activities", tags=["Activities"])


@router.get("", response_model=list[ActivityOut])
async def list_activities(
    event_type: str = Query("", description="Filter by event type"),
    channel: str = Query("", description="Filter by channel"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Activity)

    if event_type:
        query = query.where(Activity.event_type == event_type)
    if channel:
        query = query.where(Activity.channel == channel)

    query = query.order_by(Activity.created_at.desc()).limit(limit)

    result = await db.execute(query)
    activities = result.scalars().all()

    out = []
    for a in activities:
        item = ActivityOut.model_validate(a)
        if a.campaign:
            item.campaign_name = a.campaign.name
        out.append(item)
    return out
