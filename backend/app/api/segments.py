from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.segment import Segment, SegmentMembership
from app.models.customer import Customer
from app.models.persona import CustomerPersona
from app.schemas.segment import SegmentOut, SegmentBuildRequest, SegmentBuildResponse
from app.schemas.customer import CustomerOut
from uuid import UUID
from sqlalchemy import func

router = APIRouter(prefix="/api/segments", tags=["Segments"])


@router.get("", response_model=list[SegmentOut])
async def list_segments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Segment).order_by(Segment.customer_count.desc()))
    segments = result.scalars().all()
    return [SegmentOut.model_validate(s) for s in segments]


@router.get("/{segment_id}", response_model=SegmentOut)
async def get_segment(segment_id: UUID, db: AsyncSession = Depends(get_db)):
    segment = await db.get(Segment, segment_id)
    if not segment:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Segment not found")
    return SegmentOut.model_validate(segment)


@router.get("/{segment_id}/customers", response_model=list[CustomerOut])
async def get_segment_customers(segment_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Customer)
        .join(SegmentMembership, SegmentMembership.customer_id == Customer.id)
        .where(SegmentMembership.segment_id == segment_id)
        .limit(50)
    )
    customers = result.scalars().all()
    return [CustomerOut.model_validate(c) for c in customers]


@router.post("/build", response_model=SegmentBuildResponse)
async def build_segment(request: SegmentBuildRequest, db: AsyncSession = Depends(get_db)):
    """
    AI Segment Builder — parse natural language query into persona attribute filters.
    Uses simple keyword matching for now; Gemini could enhance this later.
    """
    query = request.query.lower()

    # Parse natural language into filters
    filters = []

    # Spend filters
    if "spent more than" in query or "spend above" in query or "spend over" in query:
        import re
        amounts = re.findall(r'[\₹]?\s*(\d+(?:,\d+)*(?:\.\d+)?)', query)
        if amounts:
            amount = float(amounts[0].replace(',', ''))
            filters.append(Customer.total_spend > amount)

    # Dormancy / purchase recency
    if "haven't purchased" in query or "not purchased" in query or "inactive" in query:
        import re
        days_match = re.findall(r'(\d+)\s*days?', query)
        if days_match:
            from datetime import datetime, timedelta, timezone
            cutoff = datetime.now(timezone.utc) - timedelta(days=int(days_match[0]))
            filters.append(Customer.last_purchase_date < cutoff)

    # Category filters
    categories = ["shoes", "apparel", "electronics", "accessories", "beauty", "sports"]
    persona_filters = []
    for cat in categories:
        if cat in query:
            persona_filters.append(CustomerPersona.primary_category.ilike(f"%{cat}%"))

    # Risk filters
    for risk in ["loyal", "dormant", "at_risk", "churned", "stable"]:
        if risk.replace("_", " ") in query or risk in query:
            persona_filters.append(CustomerPersona.risk_level == risk)

    # Build query
    customer_query = select(Customer).join(CustomerPersona, Customer.id == CustomerPersona.customer_id)
    for f in filters:
        customer_query = customer_query.where(f)
    for f in persona_filters:
        customer_query = customer_query.where(f)

    result = await db.execute(customer_query)
    matched_customers = result.scalars().all()

    count = len(matched_customers)
    revenue = sum(c.lifetime_value for c in matched_customers)

    # Create segment
    segment = Segment(
        name=f"AI: {request.query[:60]}",
        description=f"Auto-generated segment from query: {request.query}",
        segment_type="ai_generated",
        query_text=request.query,
        customer_count=count,
        revenue_contribution=revenue,
        engagement_rate=0.0,
        growth_trend=0.0,
    )
    db.add(segment)
    await db.flush()

    # Add memberships
    for c in matched_customers:
        db.add(SegmentMembership(segment_id=segment.id, customer_id=c.id))

    # Compute engagement rate
    if matched_customers:
        personas_result = await db.execute(
            select(CustomerPersona).where(
                CustomerPersona.customer_id.in_([c.id for c in matched_customers])
            )
        )
        personas = personas_result.scalars().all()
        if personas:
            segment.engagement_rate = round(sum(p.engagement_score for p in personas) / len(personas), 1)

    await db.commit()
    await db.refresh(segment)

    return SegmentBuildResponse(
        segment=SegmentOut.model_validate(segment),
        customers_matched=count,
        revenue_opportunity=revenue,
        reasoning=f"Matched {count} customers based on query: '{request.query}'. Combined revenue opportunity: ₹{revenue:,.0f}."
    )
