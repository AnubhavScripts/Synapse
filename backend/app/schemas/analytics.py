from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class DecisionLogOut(BaseModel):
    id: UUID
    campaign_id: Optional[UUID] = None
    customer_id: Optional[UUID] = None
    decision_type: str
    decision: str
    reasoning: str
    confidence_score: float
    source: str
    persona_snapshot: Optional[dict] = None
    alternatives_considered: Optional[dict] = None
    created_at: datetime
    customer_name: Optional[str] = None
    campaign_name: Optional[str] = None

    model_config = {"from_attributes": True}


class ActivityOut(BaseModel):
    id: UUID
    campaign_id: Optional[UUID] = None
    event_type: str
    channel: Optional[str] = None
    status: str
    description: str
    affected_count: int
    metadata_json: Optional[dict] = None
    created_at: datetime
    campaign_name: Optional[str] = None

    model_config = {"from_attributes": True}


class OpportunityOut(BaseModel):
    id: UUID
    title: str
    description: str
    opportunity_type: str
    potential_revenue: float
    affected_customers: int
    recommended_action: str
    priority: str
    status: str
    ai_reasoning: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalyticsOverview(BaseModel):
    total_customers: int
    active_customers: int
    dormant_customers: int
    total_revenue: float
    orders_this_month: int
    active_campaigns: int
    avg_customer_ltv: float
    revenue_influenced: float
    campaign_roi: float
    conversion_rate: float
    read_rate: float
    retention_rate: float


class ChannelPerformance(BaseModel):
    channel: str
    delivery_rate: float
    read_rate: float
    click_rate: float
    conversion_rate: float
    revenue: float
    campaigns_count: int
