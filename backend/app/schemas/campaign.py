from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class CampaignOut(BaseModel):
    id: UUID
    name: str
    goal: str
    segment_id: Optional[UUID] = None
    channel: str
    status: str
    message_headline: str
    message_body: str
    message_cta: str
    ai_strategy: dict
    predicted_reach: int
    predicted_opens: int
    predicted_clicks: int
    predicted_conversions: int
    predicted_revenue: float
    actual_sent: int
    actual_delivered: int
    actual_read: int
    actual_clicked: int
    actual_converted: int
    actual_failed: int
    actual_revenue: float
    created_at: datetime
    launched_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    segment_name: Optional[str] = None

    model_config = {"from_attributes": True}


class CampaignCreateRequest(BaseModel):
    name: str
    goal: str
    segment_id: Optional[UUID] = None
    channel: str
    message_headline: str
    message_body: str
    message_cta: str
    ai_strategy: dict = {}
    predicted_reach: int = 0
    predicted_opens: int = 0
    predicted_clicks: int = 0
    predicted_conversions: int = 0
    predicted_revenue: float = 0.0


class CampaignFunnelOut(BaseModel):
    queued: int
    sent: int
    delivered: int
    read: int
    clicked: int
    converted: int
    failed: int


class CampaignTimelineEvent(BaseModel):
    id: str
    timestamp: datetime
    service: str  # crm | gateway | callback | analytics
    event_type: str
    title: str
    description: str
    status: str  # success | processing | failed
    metadata: Optional[dict] = None

    model_config = {"from_attributes": True}
