from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class SegmentOut(BaseModel):
    id: UUID
    name: str
    description: str
    segment_type: str
    query_text: Optional[str] = None
    customer_count: int
    revenue_contribution: float
    engagement_rate: float
    growth_trend: float
    created_at: datetime

    model_config = {"from_attributes": True}


class SegmentBuildRequest(BaseModel):
    query: str  # Natural language query


class SegmentBuildResponse(BaseModel):
    segment: SegmentOut
    customers_matched: int
    revenue_opportunity: float
    reasoning: str
