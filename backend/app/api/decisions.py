from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.decision_log import DecisionLog
from app.schemas.analytics import DecisionLogOut

router = APIRouter(prefix="/api/decisions", tags=["Decisions"])


@router.get("", response_model=list[DecisionLogOut])
async def list_decisions(
    decision_type: str = Query("", description="Filter by decision type"),
    source: str = Query("", description="Filter by source (persona_engine or gemini_strategist)"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(DecisionLog)

    if decision_type:
        query = query.where(DecisionLog.decision_type == decision_type)
    if source:
        query = query.where(DecisionLog.source == source)

    query = query.order_by(DecisionLog.created_at.desc()).limit(limit)

    result = await db.execute(query)
    decisions = result.scalars().all()

    out = []
    for d in decisions:
        item = DecisionLogOut.model_validate(d)
        if d.customer:
            item.customer_name = d.customer.name
        if d.campaign:
            item.campaign_name = d.campaign.name
        out.append(item)
    return out
