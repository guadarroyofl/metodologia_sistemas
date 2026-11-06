"""Acceso a datos del catálogo: categorías, estilos y prendas."""
from __future__ import annotations

import math

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.catalog import Category, Product, Style, product_styles
from app.models.enums import ProductCondition, ProductStatus
from app.repositories.base import BaseRepository


def _pages(total: int, page_size: int) -> int:
    return max(1, math.ceil(total / page_size)) if total else 0


class CatalogRepository(BaseRepository[Product]):
    model = Product

    # ── Categorías ────────────────────────────────────────────────────
    def list_categories(self) -> list[Category]:
        return list(self.db.scalars(select(Category).order_by(Category.name)))

    def get_category(self, category_id: int) -> Category | None:
        return self.db.get(Category, category_id)

    def get_category_by_name(self, name: str) -> Category | None:
        return self.db.scalar(select(Category).where(func.lower(Category.name) == name.lower()))

    def get_category_by_slug(self, slug: str) -> Category | None:
        return self.db.scalar(select(Category).where(Category.slug == slug))

    def category_has_products(self, category_id: int) -> bool:
        return bool(
            self.db.scalar(
                select(func.count(Product.id)).where(Product.category_id == category_id)
            )
        )

    # ── Estilos ───────────────────────────────────────────────────────
    def list_styles(self) -> list[Style]:
        return list(self.db.scalars(select(Style).order_by(Style.name)))

    def get_style(self, style_id: int) -> Style | None:
        return self.db.get(Style, style_id)

    def get_style_by_name(self, name: str) -> Style | None:
        return self.db.scalar(select(Style).where(func.lower(Style.name) == name.lower()))

    def get_style_by_slug(self, slug: str) -> Style | None:
        return self.db.scalar(select(Style).where(Style.slug == slug))

    def get_styles_by_ids(self, style_ids: list[int]) -> list[Style]:
        if not style_ids:
            return []
        return list(self.db.scalars(select(Style).where(Style.id.in_(style_ids))))

    def get_styles_by_names(self, names: list[str]) -> list[Style]:
        if not names:
            return []
        normalized = [name.strip().lower() for name in names if name.strip()]
        if not normalized:
            return []
        return list(
            self.db.scalars(
                select(Style).where(func.lower(Style.name).in_(normalized))
            )
        )

    # ── Prendas ───────────────────────────────────────────────────────
    def _product_conditions(
        self,
        *,
        search: str | None,
        category_id: int | None,
        style: str | None,
        condition: ProductCondition | None,
        size: str | None,
        min_price: float | None,
        max_price: float | None,
        featured: bool | None,
        include_inactive: bool,
        status: ProductStatus | None,
        public_only: bool,
    ) -> list:
        conditions = []
        if not include_inactive:
            conditions.append(Product.is_active.is_(True))
        if public_only:
            conditions.append(Product.status == ProductStatus.AVAILABLE)
        if status is not None:
            conditions.append(Product.status == status)
        if search:
            term = f"%{search.strip().lower()}%"
            conditions.append(
                or_(
                    func.lower(Product.name).like(term),
                    func.lower(Product.description).like(term),
                    func.lower(func.coalesce(Product.brand, "")).like(term),
                    func.lower(Product.sku).like(term),
                )
            )
        if category_id:
            conditions.append(Product.category_id == category_id)
        if style:
            style_term = style.strip().lower()
            conditions.append(
                Product.styles.any(
                    or_(
                        func.lower(Style.slug) == style_term,
                        func.lower(Style.name) == style_term,
                    )
                )
            )
        if condition is not None:
            conditions.append(Product.condition == condition)
        if size:
            conditions.append(func.lower(Product.size) == size.strip().lower())
        if min_price is not None:
            conditions.append(Product.price >= min_price)
        if max_price is not None:
            conditions.append(Product.price <= max_price)
        if featured is not None:
            conditions.append(Product.is_featured.is_(featured))
        return conditions

    def list_products(
        self,
        *,
        search: str | None = None,
        category_id: int | None = None,
        style: str | None = None,
        condition: ProductCondition | None = None,
        size: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        featured: bool | None = None,
        status: ProductStatus | None = None,
        sort: str = "newest",
        page: int = 1,
        page_size: int = 12,
        public_only: bool = True,
        include_inactive: bool = False,
    ) -> tuple[list[Product], int]:
        conditions = self._product_conditions(
            search=search,
            category_id=category_id,
            style=style,
            condition=condition,
            size=size,
            min_price=min_price,
            max_price=max_price,
            featured=featured,
            include_inactive=include_inactive,
            status=status,
            public_only=public_only,
        )
        total = int(self.db.scalar(select(func.count(Product.id)).where(*conditions)) or 0)
        order = {
            "price_asc": Product.price.asc(),
            "price_desc": Product.price.desc(),
            "name": Product.name.asc(),
            "newest": Product.created_at.desc(),
        }.get(sort, Product.created_at.desc())
        statement = (
            select(Product)
            .where(*conditions)
            .options(joinedload(Product.category), selectinload(Product.styles))
            .order_by(order)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.db.scalars(statement)), total

    def get_product(self, product_id: int) -> Product | None:
        return self.db.scalar(
            select(Product)
            .where(Product.id == product_id)
            .options(joinedload(Product.category), selectinload(Product.styles))
        )

    def get_products_by_ids(self, product_ids: list[int]) -> list[Product]:
        if not product_ids:
            return []
        return list(
            self.db.scalars(
                select(Product)
                .where(Product.id.in_(product_ids))
                .options(joinedload(Product.category), selectinload(Product.styles))
            )
        )

    def list_available_for_ai(self, limit: int = 200) -> list[Product]:
        return list(
            self.db.scalars(
                select(Product)
                .where(Product.is_active.is_(True), Product.status == ProductStatus.AVAILABLE)
                .options(joinedload(Product.category), selectinload(Product.styles))
                .order_by(Product.is_featured.desc(), Product.created_at.desc())
                .limit(limit)
            )
        )

    def sku_exists(self, sku: str) -> bool:
        return bool(self.db.scalar(select(func.count(Product.id)).where(Product.sku == sku)))

    def count_products(self) -> int:
        return int(self.db.scalar(select(func.count(Product.id))) or 0)

    def count_style_usage(self, style_id: int) -> int:
        return int(
            self.db.scalar(
                select(func.count()).select_from(product_styles).where(
                    product_styles.c.style_id == style_id
                )
            )
            or 0
        )

    def page_meta(self, total: int, page: int, page_size: int) -> dict[str, int]:
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": _pages(total, page_size),
        }
