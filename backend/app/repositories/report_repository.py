"""Consultas agregadas para reportes, dashboard y exportaciones."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.catalog import Category, Product
from app.models.enums import ProductStatus, SaleStatus, UserRole
from app.models.sale import Sale, SaleItem
from app.models.user import User


class ReportRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Filtros comunes ───────────────────────────────────────────────
    @staticmethod
    def _sale_period(date_from: datetime, date_to: datetime) -> list:
        return [
            Sale.status == SaleStatus.COMPLETED,
            Sale.created_at >= date_from,
            Sale.created_at <= date_to,
        ]

    def sales_totals(self, date_from: datetime, date_to: datetime) -> dict:
        conditions = self._sale_period(date_from, date_to)
        row = self.db.execute(
            select(
                func.coalesce(func.sum(Sale.total), 0),
                func.coalesce(func.sum(Sale.discount), 0),
                func.count(Sale.id),
            ).where(*conditions)
        ).one()
        revenue, discounts, count = row

        item_row = self.db.execute(
            select(
                func.coalesce(func.sum(SaleItem.unit_cost * SaleItem.quantity), 0),
                func.coalesce(func.sum(SaleItem.line_profit), 0),
                func.coalesce(func.sum(SaleItem.quantity), 0),
                func.count(func.distinct(SaleItem.product_id)),
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(*conditions)
        ).one()
        cost, profit, units, products = item_row
        revenue_f, profit_f, units_i = float(revenue), float(profit), int(units)
        return {
            "revenue": revenue_f,
            "discounts": float(discounts),
            "sales_count": int(count),
            "cost": float(cost),
            "profit": profit_f,
            "units_sold": units_i,
            "products_sold": int(products),
            "average_ticket": round(revenue_f / count, 2) if count else 0.0,
            "margin_percent": round((profit_f / revenue_f) * 100, 2) if revenue_f else 0.0,
        }

    def daily_series(self, date_from: datetime, date_to: datetime) -> list[dict]:
        conditions = self._sale_period(date_from, date_to)
        sales_rows = self.db.execute(
            select(
                func.date(Sale.created_at).label("day"),
                func.coalesce(func.sum(Sale.total), 0),
                func.count(Sale.id),
            )
            .where(*conditions)
            .group_by("day")
            .order_by("day")
        ).all()
        profit_rows = self.db.execute(
            select(
                func.date(Sale.created_at).label("day"),
                func.coalesce(func.sum(SaleItem.line_profit), 0),
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(*conditions)
            .group_by("day")
        ).all()
        profit_by_day = {str(day): float(profit) for day, profit in profit_rows}
        return [
            {
                "date": str(day),
                "revenue": float(revenue),
                "profit": profit_by_day.get(str(day), 0.0),
                "sales": int(count),
            }
            for day, revenue, count in sales_rows
        ]

    def by_category(self, date_from: datetime, date_to: datetime) -> list[dict]:
        conditions = self._sale_period(date_from, date_to)
        rows = self.db.execute(
            select(
                Category.name,
                func.coalesce(func.sum(SaleItem.line_total), 0),
                func.coalesce(func.sum(SaleItem.unit_cost), 0),
                func.coalesce(func.sum(SaleItem.line_profit), 0),
                func.coalesce(func.sum(SaleItem.quantity), 0),
            )
            .select_from(SaleItem)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .join(Product, Product.id == SaleItem.product_id)
            .join(Category, Category.id == Product.category_id)
            .where(*conditions)
            .group_by(Category.id, Category.name)
            .order_by(func.sum(SaleItem.line_total).desc())
        ).all()
        result = []
        for name, revenue, cost, profit, units in rows:
            revenue_f = float(revenue)
            result.append(
                {
                    "category": name,
                    "revenue": revenue_f,
                    "cost": float(cost),
                    "profit": float(profit),
                    "units": int(units),
                    "margin_percent": round(float(profit) / revenue_f * 100, 2) if revenue_f else 0.0,
                }
            )
        return result

    def by_brand(self, date_from: datetime, date_to: datetime, limit: int = 10) -> list[dict]:
        conditions = self._sale_period(date_from, date_to)
        brand = func.coalesce(func.nullif(Product.brand, ""), "Sin marca")
        rows = self.db.execute(
            select(
                brand.label("brand"),
                func.coalesce(func.sum(SaleItem.line_total), 0),
                func.coalesce(func.sum(SaleItem.line_profit), 0),
                func.count(SaleItem.id),
            )
            .select_from(SaleItem)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .join(Product, Product.id == SaleItem.product_id)
            .where(*conditions)
            .group_by(brand)
            .order_by(func.sum(SaleItem.line_total).desc())
            .limit(limit)
        ).all()
        return [
            {
                "brand": name,
                "revenue": float(revenue),
                "profit": float(profit),
                "units": int(units),
            }
            for name, revenue, profit, units in rows
        ]

    def by_payment_method(self, date_from: datetime, date_to: datetime) -> list[dict]:
        conditions = self._sale_period(date_from, date_to)
        rows = self.db.execute(
            select(Sale.payment_method, func.count(Sale.id), func.coalesce(func.sum(Sale.total), 0))
            .where(*conditions)
            .group_by(Sale.payment_method)
            .order_by(func.sum(Sale.total).desc())
        ).all()
        return [
            {
                "method": method.value if hasattr(method, "value") else str(method),
                "sales": int(count),
                "revenue": float(revenue),
            }
            for method, count, revenue in rows
        ]

    def top_products(self, date_from: datetime, date_to: datetime, limit: int = 8) -> list[dict]:
        conditions = self._sale_period(date_from, date_to)
        rows = self.db.execute(
            select(
                Product.id,
                Product.name,
                Product.sku,
                Product.image_url,
                func.coalesce(func.sum(SaleItem.line_total), 0),
                func.coalesce(func.sum(SaleItem.line_profit), 0),
                func.count(SaleItem.id),
            )
            .select_from(SaleItem)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .join(Product, Product.id == SaleItem.product_id)
            .where(*conditions)
            .group_by(Product.id, Product.name, Product.sku, Product.image_url)
            .order_by(func.sum(SaleItem.line_total).desc())
            .limit(limit)
        ).all()
        return [
            {
                "id": pid,
                "name": name,
                "sku": sku,
                "image_url": image,
                "revenue": float(revenue),
                "profit": float(profit),
                "units": int(units),
            }
            for pid, name, sku, image, revenue, profit, units in rows
        ]

    def stock_summary(self) -> dict:
        rows = self.db.execute(
            select(Product.status, func.count(Product.id)).where(Product.is_active.is_(True)).group_by(Product.status)
        ).all()
        by_status = {
            (status.value if hasattr(status, "value") else str(status)): int(count)
            for status, count in rows
        }
        available_filters = [
            Product.is_active.is_(True),
            Product.status == ProductStatus.AVAILABLE,
        ]
        value_row = self.db.execute(
            select(
                func.coalesce(func.sum(Product.purchase_cost), 0),
                func.coalesce(func.sum(Product.price), 0),
                func.count(Product.id),
            ).where(*available_filters)
        ).one()
        return {
            "available": by_status.get("available", 0),
            "sold": by_status.get("sold", 0),
            "reserved": by_status.get("reserved", 0),
            "archived": by_status.get("archived", 0),
            "inventory_cost": float(value_row[0]),
            "inventory_retail": float(value_row[1]),
            "inventory_potential_profit": float(value_row[1]) - float(value_row[0]),
            "available_units": int(value_row[2]),
        }

    def stock_by_category(self) -> list[dict]:
        available = (
            (Product.is_active.is_(True)) & (Product.status == ProductStatus.AVAILABLE)
        )
        rows = self.db.execute(
            select(
                Category.name,
                func.count(Product.id).label("total"),
                func.sum(func.iif(available, 1, 0)).label("available"),
                func.coalesce(func.sum(func.iif(available, Product.purchase_cost, 0)), 0),
                func.coalesce(func.sum(func.iif(available, Product.price, 0)), 0),
            )
            .select_from(Category)
            .outerjoin(Product, Product.category_id == Category.id)
            .group_by(Category.id, Category.name)
            .order_by(Category.name)
        ).all()
        return [
            {
                "category": name,
                "total_products": int(total),
                "available": int(avail or 0),
                "sold_or_reserved": int(total) - int(avail or 0),
                "inventory_cost": float(cost),
                "inventory_retail": float(retail),
            }
            for name, total, avail, cost, retail in rows
        ]

    def stock_rows(self) -> list[dict]:
        products = self.db.scalars(
            select(Product)
            .where(Product.is_active.is_(True))
            .options(joinedload(Product.category), selectinload(Product.styles))
            .order_by(Product.created_at.desc())
        )
        return [
            {
                "sku": p.sku,
                "product": p.name,
                "category": p.category.name,
                "brand": p.brand or "—",
                "condition": p.condition.value,
                "status": p.status.value,
                "cost": float(p.purchase_cost),
                "price": float(p.price),
                "margin": float(p.price) - float(p.purchase_cost),
                "styles": ", ".join(style.name for style in p.styles),
            }
            for p in products
        ]

    def sales_rows(
        self, date_from: datetime, date_to: datetime, status: SaleStatus | None = None
    ) -> list[dict]:
        conditions = [Sale.created_at >= date_from, Sale.created_at <= date_to]
        if status is not None:
            conditions.append(Sale.status == status)
        sales = self.db.scalars(
            select(Sale)
            .where(*conditions)
            .options(selectinload(Sale.items), joinedload(Sale.customer))
            .order_by(Sale.created_at.desc())
        )
        return [
            {
                "code": sale.code,
                "date": sale.created_at.strftime("%Y-%m-%d %H:%M"),
                "customer": sale.customer_name or sale.customer.name,
                "email": sale.customer_email or sale.customer.email,
                "items": sale.total_items,
                "payment": sale.payment_method.value,
                "status": sale.status.value,
                "subtotal": float(sale.subtotal),
                "discount": float(sale.discount),
                "total": float(sale.total),
                "cost": float(sale.total_cost),
                "profit": float(sale.total_profit),
                "margin_percent": round(float(sale.margin_percent), 2),
            }
            for sale in sales
        ]

    def monthly_series(self, months: int = 6) -> list[dict]:
        rows = self.db.execute(
            select(
                func.strftime("%Y-%m", Sale.created_at).label("month"),
                func.coalesce(func.sum(Sale.total), 0),
                func.count(Sale.id),
            )
            .where(Sale.status == SaleStatus.COMPLETED)
            .group_by("month")
            .order_by("month")
        ).all()
        return [
            {"month": str(month), "revenue": float(revenue), "sales": int(count)}
            for month, revenue, count in rows[-months:]
        ]

    def counts(self) -> dict:
        return {
            "products": int(
                self.db.scalar(
                    select(func.count(Product.id)).where(Product.is_active.is_(True))
                )
                or 0
            ),
            "clients": int(
                self.db.scalar(
                    select(func.count(User.id)).where(
                        User.role == UserRole.CLIENT, User.is_active.is_(True)
                    )
                )
                or 0
            ),
        }

    def recent_sales(self, limit: int = 6) -> list[Sale]:
        return list(
            self.db.scalars(
                select(Sale)
                .options(selectinload(Sale.items), joinedload(Sale.customer))
                .order_by(Sale.created_at.desc())
                .limit(limit)
            )
        )

    def dashboard_totals(self) -> dict:
        row = self.db.execute(
            select(
                func.coalesce(func.sum(Sale.total), 0),
                func.count(Sale.id),
            ).where(Sale.status == SaleStatus.COMPLETED)
        ).one()
        profit = self.db.scalar(
            select(func.coalesce(func.sum(SaleItem.line_profit), 0))
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(Sale.status == SaleStatus.COMPLETED)
        )
        revenue = float(row[0])
        return {
            "lifetime_revenue": revenue,
            "lifetime_profit": float(profit or 0),
            "lifetime_sales": int(row[1]),
            "lifetime_margin": round(float(profit or 0) / revenue * 100, 2) if revenue else 0.0,
        }
