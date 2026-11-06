"""Controlador de autenticación, perfil y recuperación de contraseña."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import MessageOut
from app.schemas.user import (
    ChangePasswordIn,
    ForgotPasswordIn,
    ForgotPasswordOut,
    LoginIn,
    ProfileUpdate,
    RegisterIn,
    ResetPasswordIn,
    TokenOut,
    UserOut,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una cuenta de cliente",
)
def register(payload: RegisterIn, db: Session = Depends(get_db)) -> TokenOut:
    result = AuthService(db).register(payload)
    return TokenOut(
        access_token=result.access_token,
        expires_in=result.expires_in,
        user=UserOut.model_validate(result.user),
    )


@router.post("/login", response_model=TokenOut, summary="Iniciar sesión con email y contraseña")
def login(payload: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    result = AuthService(db).login(payload)
    return TokenOut(
        access_token=result.access_token,
        expires_in=result.expires_in,
        user=UserOut.model_validate(result.user),
    )


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordOut,
    summary="Solicitar recuperación de contraseña",
)
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)) -> ForgotPasswordOut:
    message, dev_token = AuthService(db).forgot_password(payload)
    return ForgotPasswordOut(message=message, reset_token=dev_token)


@router.post("/reset-password", response_model=MessageOut, summary="Restablecer contraseña con token")
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)) -> MessageOut:
    return MessageOut(message=AuthService(db).reset_password(payload))


@router.get("/me", response_model=UserOut, summary="Obtener el perfil autenticado")
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut, summary="Actualizar nombre o teléfono")
def update_me(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    user = AuthService(db).update_profile(current_user, payload)
    return UserOut.model_validate(user)


@router.post("/me/password", response_model=MessageOut, summary="Cambiar contraseña")
def change_password(
    payload: ChangePasswordIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    return MessageOut(message=AuthService(db).change_password(current_user, payload))
