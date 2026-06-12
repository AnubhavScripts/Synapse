import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class CampaignMessage(Base):
    """
    Per-recipient message record. Created in 'queued' state when a campaign is
    launched. Updated by the CRM callback handler as Gateway events arrive.

    The `sequence` column acts as an ordering guard — incoming callback events
    with sequence_number <= sequence are ignored as out-of-order duplicates.
    """
    __tablename__ = "campaign_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="queued"
    )  # queued|sent|delivered|read|clicked|converted|failed|expired
    sequence: Mapped[int] = mapped_column(
        Integer, default=0, comment="Last processed sequence number — ordering guard"
    )
    history: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    campaign: Mapped["Campaign"] = relationship(back_populates="messages", lazy="selectin")
    customer: Mapped["Customer"] = relationship(lazy="selectin")
