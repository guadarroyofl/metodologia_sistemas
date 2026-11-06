"""Controlador de prendas: catálogo público y administración."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models.enums import ProductCondition, ProductStatus
from app.models.user import User
from app.schemas.catalog import (
    AdminProductOut,
    AdminProductPage,
    ProductIn,
    ProductPage,
    ProductPublicOut,
    ProductUpdate,
)
from app.schemas.common import MessageOut
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/products", tags=["Prendas"])

SortOption = Literal["newest", "price_asc", "price_desc", "name"]


def _product_page(products, total: int, page: int, page_size: int) -> ProductPage:
    return ProductPage(
        items=[ProductPublicOut.model_validate(product) for product in products],
        total=total,
        page=page,
        page_size=page_size,
        pages=CatalogService.pages(total, page_size),
    )


def _admin_product_page(products, total: int, page: int, page_size: int) -> AdminProductPage:
    return AdminProductPage(
        items=[AdminProductOut.model_validate(product) for product in products],
        total=total,
        page=page,
        page_size=page_size,
        pages=CatalogService.pages(total, page_size),
    )


@router.get("", response_model=ProductPage, summary="Catálogo público de prendas disponibles")
def list_products(
    q: str | None = Query(default=None, max_length=100),
    category_id: int | None = Query(default=None, gt=0),
    style: str | None = Query(default=None, max_length=60),
    condition: ProductCondition | None = None,
    size: str | None = Query(default=None, max_length=20),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    featured: bool | None = None,
    sort: SortOption = "newest",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=48),
    db: Session = Depends(get_db),
) -> ProductPage:
    products, total = CatalogService(db).list_products(
        search=q,
        category_id=category_id,
        style=style,
        condition=condition,
        size=size,
        min_price=min_price,
        max_price=max_price,
        featured=featured,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    return _product_page(products, total, page, page_size)


@router.get("/featured", response_model=list[ProductPublicOut], summary="Prendas destacadas")
def featured_products(limit: int = Query(default=6, ge=1, le=12), db: Session = Depends(get_db)) -> list[ProductPublicOut]:
    products, _ = CatalogService(db).list_products(featured=True, page=1, page_size=limit)
    return [ProductPublicOut.model_validate(product) for product in products]


@router.get(
    "/admin/all",
    response_model=AdminProductPage,
    dependencies=[Depends(require_admin)],
    summary="Listado administrativo con costos y márgenes",
)
def admin_list_products(
    q: str | None = Query(default=None, max_length=100),
    category_id: int | None = Query(default=None, gt=0),
    style: str | None = Query(default=None, max_length=60),
    condition: ProductCondition | None = None,
    status_filter: ProductStatus | None = Query(default=None, alias="status"),
    sort: SortOption = "newest",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> AdminProductPage:
    products, total = CatalogService(db).list_products(
        search=q,
        category_id=category_id,
        style=style,
        condition=condition,
        status=status_filter,
        sort=sort,
        page=page,
        page_size=page_size,
        public_only=False,
        include_inactive=True,
    )
    return _admin_product_page(products, total, page, page_size)


@router.get("/{product_id}", response_model=ProductPublicOut, summary="Detalle de una prenda")
def get_product(product_id: int, db: Session = Depends(get_db)) -> ProductPublicOut:
    product = CatalogService(db).get_product(product_id)
    if not product.is_active:
        raise NotFoundError("Prenda no encontrada.")
    return ProductPublicOut.model_validate(product)


@router.post(
    "",
    response_model=AdminProductOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
    summary="Alta de prenda",
)
def create_product(
    payload: ProductIn,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminProductOut:
    return AdminProductOut.model_validate(CatalogService(db).create_product(payload, current_user))


@router.patch(
    "/{product_id}",
    response_model=AdminProductOut,
    dependencies=[Depends(require_admin)],
    summary="Modificar prenda",
)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminProductOut:
    return AdminProductOut.model_validate(
        CatalogService(db).update_product(product_id, payload, current_user)
    )


@router.delete(
    "/{product_id}",
    response_model=MessageOut,
    dependencies=[Depends(require_admin)],
    summary="Baja lógica de prenda",
)
def delete_product(
    product_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MessageOut:
    CatalogService(db).deactivate_product(product_id, current_user)
    return MessageOut(message="Prenda dada de baja. El historial de ventas se conserva.")
