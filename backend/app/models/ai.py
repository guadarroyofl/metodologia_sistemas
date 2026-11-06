"""Historial de sugerencias del Evaluador de Precios IA."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import utcnow
from app.db.base import Base
from app.models.enums import ProductCondition

if TYPE_CHECKING:
    from app.models.catalog import Product
    from app.models.user import User


class PriceSuggestion(Base):
    __tablename__ = "price_suggestions"
    __table_args__ = (
        Index("ix_price_suggestions_created", "created_at"),
        Index("ix_price_suggestions_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL")
    )
    strategy: Mapped[str] = mapped_column(String(30), nullable=False)
    category_name: Mapped[str] = mapped_column(String(80), nullable=False)
    condition: Mapped[ProductCondition] = mapped_column(
        SAEnum(
            ProductCondition,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
            native_enum=False,
            create_constraint=True,
            length=20,
            name="ck_suggestion_condition",
        ),
        nullable=False,
    )
    brand: Mapped[str | None] = mapped_column(String(80))
    purchase_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    suggested_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    min_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    max_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    estimated_profit: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    margin_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    confidence: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    created_by_user: Mapped["User"] = relationship(back_populates="price_suggestions")
    product: Mapped["Product | None"] = relationship()
