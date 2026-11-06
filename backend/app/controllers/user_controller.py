"""Controlador de ABM de usuarios (sólo administración)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserAdminUpdate, UserCreateIn, UserOut, UserPage
from app.services.user_service import UserService

router = APIRouter(
    prefix="/users",
    tags=["Usuarios"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=UserPage, summary="Listar usuarios con filtros")
def list_users(
    search: str | None = Query(default=None, max_length=100),
    role: UserRole | None = None,
    is_active: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> UserPage:
    users, total = UserService(db).list_users(
        search=search, role=role, is_active=is_active, page=page, page_size=page_size
    )
    service = UserService(db)
    return UserPage(
        items=[UserOut.model_validate(user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=service.pages(total, page_size),
    )


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED, summary="Alta de usuario")
def create_user(payload: UserCreateIn, db: Session = Depends(get_db)) -> UserOut:
    user = UserService(db).create_user(payload)
    return UserOut.model_validate(user)


@router.get("/{user_id}", response_model=UserOut, summary="Obtener usuario por ID")
def get_user(user_id: int, db: Session = Depends(get_db)) -> UserOut:
    return UserOut.model_validate(UserService(db).get_user(user_id))


@router.patch("/{user_id}", response_model=UserOut, summary="Modificar usuario")
def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    return UserOut.model_validate(UserService(db).update_user(current_user, user_id, payload))


@router.delete("/{user_id}", response_model=UserOut, summary="Baja lógica de usuario")
def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> UserOut:
    return UserOut.model_validate(UserService(db).deactivate_user(current_user, user_id))
