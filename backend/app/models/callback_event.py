import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, func, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class CallbackEvent(Base):
    """
    Persists every inbound webhook callback from the Messaging Gateway before processing.

    Lifecycle:
        pending → processed            (happy path)
        pending → failed → (retry) → processed
        failed  → permanently_failed   (after max_retries exceeded)

    The UNIQUE constraint on callback_id provides DB-level idempotency:
    duplicate callbacks from the Gateway are rejected at the INSERT level,
    not by application-layer checks.
    """
    __tablename__ = "callback_events"
    __table_args__ = (
        UniqueConstraint("callback_id", name="uq_callback_events_callback_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Idempotency key set by the Messaging Gateway — unique per event fire
    callback_id: Mapped[str] = mapped_column(String(100), nullable=False)

    # The CampaignMessage this event belongs to
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaign_messages.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Event type in the message lifecycle
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # sent|delivered|read|clicked|converted|failed|expired

    # Ordering guard: must be strictly greater than CampaignMessage.sequence
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Arbitrary payload from Gateway (revenue, error_message, etc.)
    details: Mapped[dict] = mapped_column(JSON, default=dict)

    # Processing state machine
    status: Mapped[str] = mapped_column(
        String(30), default="pending"
    )  # pending | processed | failed | permanently_failed

    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
