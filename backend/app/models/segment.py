import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.campaign import Campaign
    from app.models.customer import Customer


class Segment(Base):
    __tablename__ = "segments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    segment_type: Mapped[str] = mapped_column(String(20), default="prebuilt")  # prebuilt|ai_generated
    query_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_count: Mapped[int] = mapped_column(Integer, default=0)
    revenue_contribution: Mapped[float] = mapped_column(Float, default=0.0)
    engagement_rate: Mapped[float] = mapped_column(Float, default=0.0)
    growth_trend: Mapped[float] = mapped_column(Float, default=0.0)  # percentage change
    rule_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # vip|high_value|frequent|new|at_risk|dormant|discount
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    memberships: Mapped[list["SegmentMembership"]] = relationship(back_populates="segment", lazy="selectin")
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="segment")


class SegmentMembership(Base):
    __tablename__ = "segment_memberships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    segment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("segments.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    segment: Mapped["Segment"] = relationship(back_populates="memberships")
    customer: Mapped["Customer"] = relationship()
