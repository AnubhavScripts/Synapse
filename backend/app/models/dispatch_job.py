import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class DispatchJob(Base):
    """
    Persists each dispatch request received by the Messaging Gateway.

    Created BEFORE processing begins so that a Gateway crash after receiving
    but before completing does not silently lose the campaign. The full payload
    is stored so a recovery worker could replay it.

    Lifecycle:
        queued → processing → completed
                           → failed
    """
    __tablename__ = "dispatch_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Cross-service reference — no FK since this table lives on the Gateway side
    campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    # Full payload stored for potential recovery/replay
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Job state machine
    status: Mapped[str] = mapped_column(
        String(30), default="queued"
    )  # queued | processing | completed | failed

    total_messages: Mapped[int] = mapped_column(Integer, default=0)
    processed_messages: Mapped[int] = mapped_column(Integer, default=0)

    # Set on failure
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
