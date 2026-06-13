import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, Text, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.campaign import Campaign
    from app.models.customer import Customer


class DecisionLog(Base):
    __tablename__ = "decision_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    decision_type: Mapped[str] = mapped_column(String(50))  # channel_selection|audience_inclusion|offer_type|message_variant|timing
    decision: Mapped[str] = mapped_column(String(300))
    reasoning: Mapped[str] = mapped_column(Text)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    source: Mapped[str] = mapped_column(String(30), default="persona_engine")  # persona_engine|gemini_strategist
    persona_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    alternatives_considered: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    campaign: Mapped["Campaign | None"] = relationship(back_populates="decision_logs", lazy="selectin")
    customer: Mapped["Customer | None"] = relationship(back_populates="decision_logs", lazy="selectin")
