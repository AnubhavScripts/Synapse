from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.core.database import get_db
from app.models.customer import Customer
from app.models.persona import CustomerPersona
from app.models.decision_log import DecisionLog
from app.schemas.customer import CustomerOut, CustomerListOut, PersonaOut
from app.schemas.analytics import DecisionLogOut
from uuid import UUID

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get("", response_model=CustomerListOut)
async def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", description="Search by name, email, or phone"),
    risk_level: str = Query("", description="Filter by risk level"),
    channel: str = Query("", description="Filter by channel affinity"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Customer).options()
    count_query = select(func.count(Customer.id))

    if search:
        search_filter = or_(
            Customer.name.ilike(f"%{search}%"),
            Customer.email.ilike(f"%{search}%"),
            Customer.phone.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if risk_level:
        query = query.join(CustomerPersona).where(CustomerPersona.risk_level == risk_level)
        count_query = count_query.join(CustomerPersona).where(CustomerPersona.risk_level == risk_level)

    if channel:
        if not risk_level:  # Avoid double join
            query = query.join(CustomerPersona)
            count_query = count_query.join(CustomerPersona)
        query = query.where(CustomerPersona.channel_affinity == channel)
        count_query = count_query.where(CustomerPersona.channel_affinity == channel)

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Customer.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    customers = result.scalars().all()

    return CustomerListOut(
        customers=[CustomerOut.model_validate(c) for c in customers],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(customer_id: UUID, db: AsyncSession = Depends(get_db)):
    customer = await db.get(Customer, customer_id)
    if not customer:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerOut.model_validate(customer)


@router.get("/{customer_id}/decisions", response_model=list[DecisionLogOut])
async def get_customer_decisions(customer_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DecisionLog)
        .where(DecisionLog.customer_id == customer_id)
        .order_by(DecisionLog.created_at.desc())
        .limit(50)
    )
    decisions = result.scalars().all()

    out = []
    for d in decisions:
        item = DecisionLogOut.model_validate(d)
        if d.campaign:
            item.campaign_name = d.campaign.name
        out.append(item)
    return out
