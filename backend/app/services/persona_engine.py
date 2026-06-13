"""
Persona Engine — Algorithmic customer intelligence.
Computes persona attributes from purchase and engagement data.
No LLM needed.
"""

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.customer import Customer
from app.models.persona import CustomerPersona
import random


def compute_engagement_score(customer: Customer) -> int:
    """
    Weighted composite: recency (30%) + frequency (25%) + monetary (25%) + base response (20%).
    Returns 0-100.
    """
    now = datetime.now(timezone.utc)
    score = 0.0

    # Recency: days since last purchase (lower is better)
    if customer.last_purchase_date:
        days_since = (now - customer.last_purchase_date.replace(tzinfo=timezone.utc if customer.last_purchase_date.tzinfo is None else customer.last_purchase_date.tzinfo)).days
        if days_since <= 7:
            recency = 100
        elif days_since <= 30:
            recency = 80
        elif days_since <= 60:
            recency = 60
        elif days_since <= 90:
            recency = 40
        elif days_since <= 180:
            recency = 20
        else:
            recency = 5
    else:
        recency = 0

    # Frequency: order count
    if customer.order_count >= 20:
        frequency = 100
    elif customer.order_count >= 10:
        frequency = 80
    elif customer.order_count >= 5:
        frequency = 60
    elif customer.order_count >= 3:
        frequency = 40
    elif customer.order_count >= 1:
        frequency = 20
    else:
        frequency = 0

    # Monetary: total spend
    if customer.total_spend >= 50000:
        monetary = 100
    elif customer.total_spend >= 25000:
        monetary = 80
    elif customer.total_spend >= 10000:
        monetary = 60
    elif customer.total_spend >= 5000:
        monetary = 40
    elif customer.total_spend >= 1000:
        monetary = 20
    else:
        monetary = 5

    # Base response rate (simulated based on order engagement)
    base_response = min(100, customer.order_count * 8 + 10) if customer.order_count > 0 else 5

    score = recency * 0.30 + frequency * 0.25 + monetary * 0.25 + base_response * 0.20
    return max(0, min(100, int(score)))


def compute_risk_level(customer: Customer, avg_days: float) -> str:
    """Based on days since last purchase vs avg purchase interval."""
    if not customer.last_purchase_date or avg_days <= 0:
        return "churned"

    now = datetime.now(timezone.utc)
    days_since = (now - customer.last_purchase_date.replace(tzinfo=timezone.utc if customer.last_purchase_date.tzinfo is None else customer.last_purchase_date.tzinfo)).days
    ratio = days_since / max(avg_days, 1)

    if ratio < 1.0:
        return "loyal"
    elif ratio < 1.5:
        return "stable"
    elif ratio < 2.5:
        return "at_risk"
    elif ratio < 4.0:
        return "dormant"
    else:
        return "churned"


def compute_channel_affinity(customer: Customer) -> tuple[str, dict]:
    """
    Determine preferred channel from engagement patterns.
    In a real system this would use actual campaign response data.
    For seed data, we compute deterministically from customer attributes.
    """
    # Simulate channel scores based on customer patterns
    name_hash = sum(ord(c) for c in customer.name) % 100

    if name_hash < 40:
        scores = {"whatsapp": 0.82 + random.uniform(0, 0.15), "sms": 0.35 + random.uniform(0, 0.15), "email": 0.20 + random.uniform(0, 0.10), "rcs": 0.55 + random.uniform(0, 0.15)}
    elif name_hash < 65:
        scores = {"whatsapp": 0.55 + random.uniform(0, 0.15), "sms": 0.30 + random.uniform(0, 0.10), "email": 0.65 + random.uniform(0, 0.15), "rcs": 0.40 + random.uniform(0, 0.10)}
    elif name_hash < 85:
        scores = {"whatsapp": 0.70 + random.uniform(0, 0.15), "sms": 0.50 + random.uniform(0, 0.15), "email": 0.35 + random.uniform(0, 0.10), "rcs": 0.72 + random.uniform(0, 0.15)}
    else:
        scores = {"whatsapp": 0.45 + random.uniform(0, 0.10), "sms": 0.60 + random.uniform(0, 0.15), "email": 0.40 + random.uniform(0, 0.10), "rcs": 0.30 + random.uniform(0, 0.10)}

    # Clamp scores
    scores = {k: round(min(v, 0.98), 2) for k, v in scores.items()}
    best_channel = max(scores, key=lambda k: scores[k])
    return best_channel, scores


def compute_discount_affinity(customer: Customer) -> tuple[str, float]:
    """Compute discount sensitivity from purchase patterns."""
    # Simulate: lower AOV relative to spend suggests discount-driven behavior
    if customer.order_count == 0:
        return "none", 0.0

    aov = customer.average_order_value
    if aov < 500:
        return "high", round(random.uniform(0.60, 0.85), 2)
    elif aov < 1500:
        return "medium", round(random.uniform(0.30, 0.55), 2)
    elif aov < 3000:
        return "low", round(random.uniform(0.10, 0.30), 2)
    else:
        return "none", round(random.uniform(0.02, 0.10), 2)


def compute_category_affinity(customer: Customer) -> tuple[str, str | None]:
    """Determine primary and secondary product categories."""
    categories = ["Shoes", "Apparel", "Electronics", "Accessories", "Beauty", "Home & Living", "Sports", "Food & Beverage"]
    name_hash = sum(ord(c) for c in customer.email) % len(categories)
    primary = categories[name_hash]
    secondary = categories[(name_hash + 3) % len(categories)] if customer.order_count >= 3 else None
    return primary, secondary


def compute_price_sensitivity(customer: Customer) -> str:
    """AOV-based price sensitivity."""
    if customer.average_order_value >= 3000:
        return "low"
    elif customer.average_order_value >= 1000:
        return "medium"
    else:
        return "high"


def compute_avg_days_between_purchases(customer: Customer) -> float:
    """Estimate average days between purchases."""
    if customer.order_count <= 1:
        return 90.0
    now = datetime.now(timezone.utc)
    created = customer.created_at.replace(tzinfo=timezone.utc if customer.created_at.tzinfo is None else customer.created_at.tzinfo)
    total_days = max((now - created).days, 1)
    return round(total_days / max(customer.order_count - 1, 1), 1)


def compute_preferred_time(customer: Customer) -> str:
    """Determine preferred engagement time slot."""
    name_hash = sum(ord(c) for c in customer.name) % 4
    return ["morning", "afternoon", "evening", "night"][name_hash]


async def compute_persona_for_customer(customer: Customer, session: AsyncSession) -> CustomerPersona:
    """Compute full persona for a single customer."""
    channel_affinity, channel_scores = compute_channel_affinity(customer)
    discount_affinity, discount_rate = compute_discount_affinity(customer)
    primary_cat, secondary_cat = compute_category_affinity(customer)
    avg_days = compute_avg_days_between_purchases(customer)
    engagement = compute_engagement_score(customer)
    risk = compute_risk_level(customer, avg_days)
    price_sens = compute_price_sensitivity(customer)
    pref_time = compute_preferred_time(customer)

    now = datetime.now(timezone.utc)
    days_since = 0
    if customer.last_purchase_date:
        lp = customer.last_purchase_date
        if lp.tzinfo is None:
            lp = lp.replace(tzinfo=timezone.utc)
        days_since = (now - lp).days

    computation_factors = {
        "recency_days": days_since,
        "order_count": customer.order_count,
        "total_spend": customer.total_spend,
        "avg_order_value": customer.average_order_value,
        "avg_purchase_interval": avg_days,
    }

    # Check if persona exists
    result = await session.execute(
        select(CustomerPersona).where(CustomerPersona.customer_id == customer.id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.primary_category = primary_cat
        existing.secondary_category = secondary_cat
        existing.channel_affinity = channel_affinity
        existing.channel_scores = channel_scores
        existing.discount_affinity = discount_affinity
        existing.discount_response_rate = discount_rate
        existing.engagement_score = engagement
        existing.risk_level = risk
        existing.price_sensitivity = price_sens
        existing.preferred_time = pref_time
        existing.avg_days_between_purchases = avg_days
        existing.computation_factors = computation_factors
        existing.last_computed_at = now
        return existing
    else:
        persona = CustomerPersona(
            customer_id=customer.id,
            primary_category=primary_cat,
            secondary_category=secondary_cat,
            channel_affinity=channel_affinity,
            channel_scores=channel_scores,
            discount_affinity=discount_affinity,
            discount_response_rate=discount_rate,
            engagement_score=engagement,
            risk_level=risk,
            price_sensitivity=price_sens,
            preferred_time=pref_time,
            avg_days_between_purchases=avg_days,
            computation_factors=computation_factors,
            last_computed_at=now,
        )
        session.add(persona)
        return persona


async def compute_all_personas(session: AsyncSession) -> int:
    """Recompute personas for all customers. Returns count."""
    result = await session.execute(select(Customer))
    customers = result.scalars().all()
    count = 0
    for customer in customers:
        await compute_persona_for_customer(customer, session)
        count += 1
    await session.commit()
    return count
