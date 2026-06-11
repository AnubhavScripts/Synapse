import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class CustomerPersona(Base):
    __tablename__ = "customer_personas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), unique=True)
    primary_category: Mapped[str] = mapped_column(String(100), default="General")
    secondary_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    channel_affinity: Mapped[str] = mapped_column(String(20), default="email")  # whatsapp|sms|email|rcs
    channel_scores: Mapped[dict] = mapped_column(JSON, default=dict)
    discount_affinity: Mapped[str] = mapped_column(String(20), default="medium")  # high|medium|low|none
    discount_response_rate: Mapped[float] = mapped_column(Float, default=0.0)
    engagement_score: Mapped[int] = mapped_column(Integer, default=50)  # 0-100
    risk_level: Mapped[str] = mapped_column(String(20), default="stable")  # loyal|stable|at_risk|dormant|churned
    price_sensitivity: Mapped[str] = mapped_column(String(20), default="medium")  # high|medium|low
    preferred_time: Mapped[str] = mapped_column(String(20), default="evening")  # morning|afternoon|evening|night
    avg_days_between_purchases: Mapped[float] = mapped_column(Float, default=30.0)
    computation_factors: Mapped[dict] = mapped_column(JSON, default=dict)
    last_computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="persona")
