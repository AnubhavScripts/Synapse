import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(300), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(20))
    total_spend: Mapped[float] = mapped_column(Float, default=0.0)
    average_order_value: Mapped[float] = mapped_column(Float, default=0.0)
    order_count: Mapped[int] = mapped_column(Integer, default=0)
    last_purchase_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lifetime_value: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    persona: Mapped["CustomerPersona"] = relationship(back_populates="customer", uselist=False, lazy="selectin")
    decision_logs: Mapped[list["DecisionLog"]] = relationship(back_populates="customer")
