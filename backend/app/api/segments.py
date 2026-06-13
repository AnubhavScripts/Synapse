from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.segment import Segment, SegmentMembership
from app.models.customer import Customer
from app.models.persona import CustomerPersona
from app.schemas.segment import SegmentOut, SegmentBuildRequest, SegmentBuildResponse, SegmentMemberResponse, SegmentMemberPreview
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


@router.get("/{segment_id}/members", response_model=SegmentMemberResponse)
async def get_segment_members_preview(segment_id: UUID, db: AsyncSession = Depends(get_db)):
    # 1. Fetch the segment to determine its rule_type
    segment = await db.get(Segment, segment_id)
    if not segment:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Segment not found")

    # 2. Count total members
    total_count_res = await db.execute(
        select(func.count(SegmentMembership.customer_id))
        .where(SegmentMembership.segment_id == segment_id)
    )
    total_members = total_count_res.scalar() or 0

    # 3. Determine sorting based on rule_type
    query = select(Customer, CustomerPersona).join(
        SegmentMembership, SegmentMembership.customer_id == Customer.id
    ).outerjoin(
        CustomerPersona, CustomerPersona.customer_id == Customer.id
    ).where(
        SegmentMembership.segment_id == segment_id
    )

    rule_type = segment.rule_type
    if rule_type in ("vip", "high_value"):
        query = query.order_by(Customer.lifetime_value.desc())
    elif rule_type == "frequent":
        query = query.order_by(Customer.order_count.desc())
    elif rule_type == "new":
        query = query.order_by(Customer.created_at.desc())
    elif rule_type in ("at_risk", "dormant"):
        query = query.order_by(Customer.last_purchase_date.asc())
    elif rule_type == "discount":
        query = query.order_by(CustomerPersona.discount_response_rate.desc())
    else:
        # Fallback sort
        query = query.order_by(Customer.lifetime_value.desc())

    # Limit to 10
    query = query.limit(10)
    result = await db.execute(query)
    rows = result.all()

    # 4. Map to SegmentMemberPreview schemas
    from datetime import datetime, timezone
    now_utc = datetime.now(timezone.utc)
    preview_members = []

    for customer, persona in rows:
        # Calculate last purchase days
        last_purchase_days = 0
        if customer.last_purchase_date:
            delta = now_utc - customer.last_purchase_date
            last_purchase_days = max(delta.days, 0)

        # Dynamic explanations and badges based on rule_type
        why_included = "Matches segment criteria."
        signal_badge = "AUDIENCE MEMBER"

        # Safe formatting of currency for dynamic descriptions
        ltv_formatted = f"₹{customer.lifetime_value:,.0f}"

        if rule_type == "vip":
            signal_badge = "TOP 5% SPENDER"
            why_included = f"In top spending cohort (LTV: {ltv_formatted})"
        elif rule_type == "high_value":
            signal_badge = "HIGH VALUE COHORT"
            why_included = f"High-tier spending customer (LTV: {ltv_formatted})"
        elif rule_type == "frequent":
            signal_badge = "HIGH FREQUENCY"
            why_included = f"Highly active buyer with {customer.order_count} lifetime orders"
        elif rule_type == "new":
            joined_delta = now_utc - customer.created_at
            joined_days = max(joined_delta.days, 0)
            signal_badge = "NEWLY ACQUIRED"
            why_included = f"Recently acquired customer (joined {joined_days} days ago)"
        elif rule_type == "at_risk":
            signal_badge = f"{last_purchase_days} DAYS INACTIVE"
            why_included = f"No purchase activity for {last_purchase_days} days (showing early churn signals)"
        elif rule_type == "dormant":
            signal_badge = f"{last_purchase_days} DAYS INACTIVE"
            why_included = f"No purchase activity for {last_purchase_days} days (requires win-back effort)"
        elif rule_type == "discount" and persona:
            rate = int(persona.discount_response_rate * 100)
            signal_badge = f"{rate}% DISCOUNT AFFINITY"
            why_included = f"High promotional coupon response rate ({rate}%)"
        else:
            cat = persona.primary_category if persona else "General"
            signal_badge = "AUDIENCE MEMBER"
            why_included = f"Matches persona category: {cat}"

        preview_members.append(
            SegmentMemberPreview(
                id=str(customer.id),
                name=customer.name,
                lifetime_value=customer.lifetime_value,
                order_count=customer.order_count,
                last_purchase_days=last_purchase_days,
                risk_level=persona.risk_level if persona else "stable",
                why_included=why_included,
                signal_badge=signal_badge
            )
        )

    return SegmentMemberResponse(
        total_members=total_members,
        preview_members=preview_members
    )


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
