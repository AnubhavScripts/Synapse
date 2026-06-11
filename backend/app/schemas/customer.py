from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class PersonaOut(BaseModel):
    id: UUID
    customer_id: UUID
    primary_category: str
    secondary_category: Optional[str] = None
    channel_affinity: str
    channel_scores: dict
    discount_affinity: str
    discount_response_rate: float
    engagement_score: int
    risk_level: str
    price_sensitivity: str
    preferred_time: str
    avg_days_between_purchases: float
    computation_factors: dict
    last_computed_at: datetime

    model_config = {"from_attributes": True}


class CustomerOut(BaseModel):
    id: UUID
    name: str
    email: str
    phone: str
    total_spend: float
    average_order_value: float
    order_count: int
    last_purchase_date: Optional[datetime] = None
    lifetime_value: float
    created_at: datetime
    updated_at: datetime
    persona: Optional[PersonaOut] = None

    model_config = {"from_attributes": True}


class CustomerListOut(BaseModel):
    customers: list[CustomerOut]
    total: int
    page: int
    page_size: int
