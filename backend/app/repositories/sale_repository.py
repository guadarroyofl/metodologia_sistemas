"""Acceso a datos de ventas con carga anticipada de relaciones."""
from __future__ import annotations

import math
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload, selectinload

from app.models.enums import SaleStatus
from app.models.sale import Sale
from app.repositories.base import BaseRepository


class SaleRepository(BaseRepository[Sale]):
    model = Sale

    def get_full(self, sale_id: int) -> Sale | None:
        return self.db.scalar(
            select(Sale)
            .where(Sale.id == sale_id)
            .options(
                selectinload(Sale.items),
                joinedload(Sale.customer),
                joinedload(Sale.sold_by),
            )
        )

    def get_by_code(self, code: str) -> Sale | None:
        return self.db.scalar(select(Sale).where(Sale.code == code))

    def code_exists(self, code: str) -> bool:
        return bool(self.db.scalar(select(func.count(Sale.id)).where(Sale.code == code)))

    def list_sales(
        self,
        *,
        user_id: int | None = None,
        status: SaleStatus | None = None,
        search: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Sale], int]:
        conditions = []
        if user_id is not None:
            conditions.append(Sale.user_id == user_id)
        if status is not None:
            conditions.append(Sale.status == status)
        if date_from is not None:
            conditions.append(Sale.created_at >= date_from)
        if date_to is not None:
            conditions.append(Sale.created_at <= date_to)
        if search:
            term = f"%{search.strip().lower()}%"
            conditions.append(
                or_(
                    func.lower(Sale.code).like(term),
                    func.lower(func.coalesce(Sale.customer_name, "")).like(term),
                    func.lower(func.coalesce(Sale.customer_email, "")).like(term),
                )
            )

        total = int(self.db.scalar(select(func.count(Sale.id)).where(*conditions)) or 0)
        statement = (
            select(Sale)
            .where(*conditions)
            .options(selectinload(Sale.items), joinedload(Sale.customer))
            .order_by(Sale.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.db.scalars(statement)), total

    @staticmethod
    def page_meta(total: int, page: int, page_size: int) -> dict[str, int]:
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": max(1, math.ceil(total / page_size)) if total else 0,
        }
