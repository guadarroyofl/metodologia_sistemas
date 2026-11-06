"""Catálogo: categorías, estilos, prendas y su relación N:M."""
from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import ProductCondition, ProductStatus

if TYPE_CHECKING:
    from app.models.sale import SaleItem

product_styles = Table(
    "product_styles",
    Base.metadata,
    Column("product_id", ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("style_id", ForeignKey("styles.id", ondelete="CASCADE"), primary_key=True),
)
"""Tabla puente N:M entre prendas y estilos (etiquetas de moda)."""


def _condition_enum() -> SAEnum:
    return SAEnum(
        ProductCondition,
        values_callable=lambda enum_cls: [item.value for item in enum_cls],
        native_enum=False,
        create_constraint=True,
        length=20,
        name="ck_product_condition",
    )


def _status_enum() -> SAEnum:
    return SAEnum(
        ProductStatus,
        values_callable=lambda enum_cls: [item.value for item in enum_cls],
        native_enum=False,
        create_constraint=True,
        length=20,
        name="ck_product_status",
    )


class Category(TimestampMixin, Base):
    __tablename__ = "categories"
    __table_args__ = (Index("ix_categories_slug", "slug", unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # Denormalización controlada NO usada: los conteos se calculan por consulta.

    products: Mapped[list[Product]] = relationship(back_populates="category")


class Style(TimestampMixin, Base):
    __tablename__ = "styles"
    __table_args__ = (Index("ix_styles_slug", "slug", unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    products: Mapped[list[Product]] = relationship(
        secondary=product_styles, back_populates="styles"
    )


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price > 0", name="ck_products_price_positive"),
        CheckConstraint("purchase_cost >= 0", name="ck_products_cost_non_negative"),
        Index("ix_products_status_active", "status", "is_active"),
        Index("ix_products_category", "category_id"),
        Index("ix_products_name", "name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    brand: Mapped[str | None] = mapped_column(String(80))
    size: Mapped[str | None] = mapped_column(String(20))
    color: Mapped[str | None] = mapped_column(String(50))
    condition: Mapped[ProductCondition] = mapped_column(
        _condition_enum(), default=ProductCondition.MUY_BUENO, nullable=False
    )
    status: Mapped[ProductStatus] = mapped_column(
        _status_enum(), default=ProductStatus.AVAILABLE, nullable=False
    )
    purchase_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500))
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    category: Mapped[Category] = relationship(back_populates="products")
    styles: Mapped[list[Style]] = relationship(
        secondary=product_styles, back_populates="products", lazy="selectin"
    )
    sale_items: Mapped[list["SaleItem"]] = relationship(back_populates="product")  # noqa: F821

    @property
    def available(self) -> bool:
        return self.is_active and self.status == ProductStatus.AVAILABLE

    @property
    def margin_amount(self) -> Decimal:
        return Decimal(self.price) - Decimal(self.purchase_cost)

    @property
    def margin_percent(self) -> Decimal:
        if not self.price:
            return Decimal("0")
        return (self.margin_amount / Decimal(self.price)) * Decimal("100")
