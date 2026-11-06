"""Movimientos de inventario: trazabilidad de ingresos, ventas y devoluciones."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Enum as SAEnum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import utcnow
from app.db.base import Base
from app.models.enums import MovementType

if TYPE_CHECKING:
    from app.models.catalog import Product


def _movement_enum() -> SAEnum:
    return SAEnum(
        MovementType,
        values_callable=lambda enum_cls: [item.value for item in enum_cls],
        native_enum=False,
        create_constraint=True,
        length=20,
        name="ck_movement_type",
    )


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_movements_quantity_positive"),
        Index("ix_movements_product_created", "product_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    movement_type: Mapped[MovementType] = mapped_column(_movement_enum(), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    reference: Mapped[str | None] = mapped_column(String(60))
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    product: Mapped["Product"] = relationship()
