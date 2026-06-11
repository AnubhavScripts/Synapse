from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.opportunity import Opportunity
from app.schemas.analytics import OpportunityOut
from app.services.opportunity_engine import refresh_opportunities
from uuid import UUID

router = APIRouter(prefix="/api/opportunities", tags=["Opportunities"])


@router.get("", response_model=list[OpportunityOut])
async def list_opportunities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Opportunity)
        .where(Opportunity.status == "active")
        .order_by(Opportunity.priority.asc(), Opportunity.potential_revenue.desc())
    )
    opps = result.scalars().all()
    return [OpportunityOut.model_validate(o) for o in opps]


@router.post("/{opportunity_id}/dismiss")
async def dismiss_opportunity(opportunity_id: UUID, db: AsyncSession = Depends(get_db)):
    opp = await db.get(Opportunity, opportunity_id)
    if opp:
        opp.status = "dismissed"
        await db.commit()
    return {"status": "dismissed"}


@router.post("/refresh", response_model=list[OpportunityOut])
async def refresh(db: AsyncSession = Depends(get_db)):
    opps = await refresh_opportunities(db)
    return [OpportunityOut.model_validate(o) for o in opps]
