"""Controladores de categorías y estilos."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.schemas.catalog import CategoryIn, CategoryOut, CategoryUpdate, StyleIn, StyleOut, StyleUpdate
from app.schemas.common import MessageOut
from app.services.catalog_service import CatalogService

categories_router = APIRouter(prefix="/categories", tags=["Categorías"])
styles_router = APIRouter(prefix="/styles", tags=["Estilos"])


@categories_router.get("", response_model=list[CategoryOut], summary="Listar categorías")
def list_categories(db: Session = Depends(get_db)) -> list[CategoryOut]:
    return [CategoryOut.model_validate(category) for category in CatalogService(db).list_categories()]


@categories_router.post(
    "",
    response_model=CategoryOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
    summary="Crear categoría",
)
def create_category(payload: CategoryIn, db: Session = Depends(get_db)) -> CategoryOut:
    return CategoryOut.model_validate(CatalogService(db).create_category(payload))


@categories_router.patch(
    "/{category_id}",
    response_model=CategoryOut,
    dependencies=[Depends(require_admin)],
    summary="Modificar categoría",
)
def update_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)) -> CategoryOut:
    return CategoryOut.model_validate(CatalogService(db).update_category(category_id, payload))


@categories_router.delete(
    "/{category_id}",
    response_model=MessageOut,
    dependencies=[Depends(require_admin)],
    summary="Eliminar categoría sin prendas asociadas",
)
def delete_category(category_id: int, db: Session = Depends(get_db)) -> MessageOut:
    CatalogService(db).delete_category(category_id)
    return MessageOut(message="Categoría eliminada correctamente.")


@styles_router.get("", response_model=list[StyleOut], summary="Listar estilos")
def list_styles(db: Session = Depends(get_db)) -> list[StyleOut]:
    return [StyleOut.model_validate(style) for style in CatalogService(db).list_styles()]


@styles_router.post(
    "",
    response_model=StyleOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
    summary="Crear estilo",
)
def create_style(payload: StyleIn, db: Session = Depends(get_db)) -> StyleOut:
    return StyleOut.model_validate(CatalogService(db).create_style(payload))


@styles_router.patch(
    "/{style_id}",
    response_model=StyleOut,
    dependencies=[Depends(require_admin)],
    summary="Modificar estilo",
)
def update_style(style_id: int, payload: StyleUpdate, db: Session = Depends(get_db)) -> StyleOut:
    return StyleOut.model_validate(CatalogService(db).update_style(style_id, payload))


@styles_router.delete(
    "/{style_id}",
    response_model=MessageOut,
    dependencies=[Depends(require_admin)],
    summary="Eliminar estilo sin prendas asociadas",
)
def delete_style(style_id: int, db: Session = Depends(get_db)) -> MessageOut:
    CatalogService(db).delete_style(style_id)
    return MessageOut(message="Estilo eliminado correctamente.")
