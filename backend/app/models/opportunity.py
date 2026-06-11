import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    opportunity_type: Mapped[str] = mapped_column(String(30))  # dormant_recovery|churn_prevention|upsell|cross_sell|emerging_vip|loyalty
    potential_revenue: Mapped[float] = mapped_column(Float, default=0.0)
    affected_customers: Mapped[int] = mapped_column(Integer, default=0)
    recommended_action: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(10), default="medium")  # high|medium|low
    status: Mapped[str] = mapped_column(String(20), default="active")  # active|acted_on|dismissed
    ai_reasoning: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # v2 — Opportunity Investigation Layer
    # These columns are added via ALTER TABLE migration in main.py startup
    priority_score: Mapped[int] = mapped_column(Integer, default=50)
    key_drivers: Mapped[list] = mapped_column(JSONB, default=list)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
