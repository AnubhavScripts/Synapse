import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Text, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(300))
    goal: Mapped[str] = mapped_column(Text, default="")
    segment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("segments.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(20), default="whatsapp")  # whatsapp|sms|email|rcs
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft|queued|processing|sending|completed|failed
    message_headline: Mapped[str] = mapped_column(String(500), default="")
    message_body: Mapped[str] = mapped_column(Text, default="")
    message_cta: Mapped[str] = mapped_column(String(200), default="")
    ai_strategy: Mapped[dict] = mapped_column(JSON, default=dict)
    # Predicted metrics
    predicted_reach: Mapped[int] = mapped_column(Integer, default=0)
    predicted_opens: Mapped[int] = mapped_column(Integer, default=0)
    predicted_clicks: Mapped[int] = mapped_column(Integer, default=0)
    predicted_conversions: Mapped[int] = mapped_column(Integer, default=0)
    predicted_revenue: Mapped[float] = mapped_column(Float, default=0.0)
    # Actual metrics (updated by channel simulator)
    actual_sent: Mapped[int] = mapped_column(Integer, default=0)
    actual_delivered: Mapped[int] = mapped_column(Integer, default=0)
    actual_read: Mapped[int] = mapped_column(Integer, default=0)
    actual_clicked: Mapped[int] = mapped_column(Integer, default=0)
    actual_converted: Mapped[int] = mapped_column(Integer, default=0)
    actual_failed: Mapped[int] = mapped_column(Integer, default=0)
    actual_revenue: Mapped[float] = mapped_column(Float, default=0.0)
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    launched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    segment: Mapped["Segment | None"] = relationship(back_populates="campaigns", lazy="selectin")
    decision_logs: Mapped[list["DecisionLog"]] = relationship(back_populates="campaign")
    activities: Mapped[list["Activity"]] = relationship(back_populates="campaign")
