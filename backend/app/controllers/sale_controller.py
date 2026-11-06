"""Controladores de ventas del cliente y de administración."""
from __future__ import annotations

from datetime import date, datetime, time

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.db.session import get_db
from app.models.enums import SaleStatus
from app.models.user import User
from app.schemas.sale import (
    AdminSaleOut,
    AdminSalePage,
    SaleCancelIn,
    SaleCreate,
    SaleOut,
    SalePage,
)
from app.services.sale_service import SaleService

router = APIRouter(prefix="/sales", tags=["Ventas"])
admin_router = APIRouter(
    prefix="/admin/sales",
    tags=["Ventas · Administración"],
    dependencies=[Depends(require_admin)],
)


@router.post("", response_model=SaleOut, summary="Confirmar compra (checkout)")
def checkout(
    payload: SaleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SaleOut:
    sale = SaleService(db).checkout(current_user, payload)
    return SaleOut.model_validate(sale)


@router.get("/mine", response_model=SalePage, summary="Mis compras")
def my_sales(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SalePage:
    service = SaleService(db)
    sales, total = service.list_my_sales(current_user, page, page_size)
    return SalePage(
        items=[SaleOut.model_validate(sale) for sale in sales],
        total=total,
        page=page,
        page_size=page_size,
        pages=service.pages(total, page_size),
    )


@router.get("/{sale_id}", response_model=SaleOut, summary="Detalle de una compra propia")
def get_sale(
    sale_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SaleOut:
    return SaleOut.model_validate(SaleService(db).get_sale_for_actor(sale_id, current_user))


@admin_router.get("", response_model=AdminSalePage, summary="Listar todas las ventas")
def list_sales(
    status_filter: SaleStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=100),
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> AdminSalePage:
    start = datetime.combine(date_from, time.min) if date_from else None
    end = datetime.combine(date_to, time.max) if date_to else None
    service = SaleService(db)
    sales, total = service.list_all_sales(
        status=status_filter,
        search=search,
        date_from=start,
        date_to=end,
        page=page,
        page_size=page_size,
    )
    return AdminSalePage(
        items=[AdminSaleOut.model_validate(sale) for sale in sales],
        total=total,
        page=page,
        page_size=page_size,
        pages=service.pages(total, page_size),
    )


@admin_router.get("/{sale_id}", response_model=AdminSaleOut, summary="Detalle administrativo de venta")
def get_sale_admin(sale_id: int, db: Session = Depends(get_db)) -> AdminSaleOut:
    service = SaleService(db)
    sales = service.sales.get_full(sale_id)
    if sales is None:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("Venta no encontrada.")
    return AdminSaleOut.model_validate(sales)


@admin_router.post("/{sale_id}/cancel", response_model=AdminSaleOut, summary="Cancelar venta y reponer stock")
def cancel_sale(
    sale_id: int,
    payload: SaleCancelIn,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminSaleOut:
    sale = SaleService(db).cancel_sale(sale_id, current_user, payload.reason)
    return AdminSaleOut.model_validate(sale)
