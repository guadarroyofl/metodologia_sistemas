"""Ventas y detalle de ventas (snapshots de precio/costo para trazabilidad)."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import utcnow
from app.db.base import Base, TimestampMixin
from app.models.enums import PaymentMethod, SaleStatus

if TYPE_CHECKING:
    from app.models.catalog import Product
    from app.models.user import User


def _status_enum() -> SAEnum:
    return SAEnum(
        SaleStatus,
        values_callable=lambda enum_cls: [item.value for item in enum_cls],
        native_enum=False,
        create_constraint=True,
        length=20,
        name="ck_sale_status",
    )


def _payment_enum() -> SAEnum:
    return SAEnum(
        PaymentMethod,
        values_callable=lambda enum_cls: [item.value for item in enum_cls],
        native_enum=False,
        create_constraint=True,
        length=20,
        name="ck_payment_method",
    )


class Sale(TimestampMixin, Base):
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_sales_subtotal_non_negative"),
        CheckConstraint("discount >= 0", name="ck_sales_discount_non_negative"),
        CheckConstraint("total >= 0", name="ck_sales_total_non_negative"),
        Index("ix_sales_created_at", "created_at"),
        Index("ix_sales_status", "status"),
        Index("ix_sales_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    sold_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    customer_name: Mapped[str | None] = mapped_column(String(120))
    customer_email: Mapped[str | None] = mapped_column(String(255))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(_payment_enum(), nullable=False)
    status: Mapped[SaleStatus] = mapped_column(
        _status_enum(), default=SaleStatus.COMPLETED, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    customer: Mapped["User"] = relationship(back_populates="sales", foreign_keys=[user_id])
    sold_by: Mapped["User | None"] = relationship(foreign_keys=[sold_by_id])
    items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def total_items(self) -> int:
        return sum(item.quantity for item in self.items)

    @property
    def total_cost(self) -> Decimal:
        return sum((item.unit_cost for item in self.items), Decimal("0"))

    @property
    def total_profit(self) -> Decimal:
        return sum((item.line_profit for item in self.items), Decimal("0"))

    @property
    def margin_percent(self) -> Decimal:
        if not self.total:
            return Decimal("0")
        return (self.total_profit / Decimal(self.total)) * Decimal("100")


class SaleItem(Base):
    __tablename__ = "sale_items"
    __table_args__ = (
        UniqueConstraint("sale_id", "product_id", name="uq_sale_items_sale_product"),
        CheckConstraint("quantity = 1", name="ck_sale_items_unique_unit"),
        CheckConstraint("unit_price >= 0", name="ck_sale_items_price_non_negative"),
        CheckConstraint("unit_cost >= 0", name="ck_sale_items_cost_non_negative"),
        Index("ix_sale_items_product", "product_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(
        ForeignKey("sales.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    product_name: Mapped[str] = mapped_column(String(160), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    line_profit: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    sale: Mapped[Sale] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="sale_items")
