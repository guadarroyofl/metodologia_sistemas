"""Dependencias de autenticación y autorización por roles."""
from __future__ import annotations

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False, description="JWT obtenido en /api/auth/login")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Necesitás iniciar sesión para continuar.", code="missing_token")
    payload = decode_access_token(credentials.credentials)
    try:
        user_id = int(payload.get("sub", ""))
    except (TypeError, ValueError) as exc:
        raise UnauthorizedError("Token inválido.", code="invalid_token") from exc
    user = db.get(User, user_id)
    if user is None:
        raise UnauthorizedError("El usuario ya no existe.", code="user_not_found")
    if not user.is_active:
        raise UnauthorizedError("Tu cuenta está desactivada.", code="inactive_user")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenError("Esta acción requiere rol de administrador.")
    return current_user


def require_client(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {UserRole.CLIENT, UserRole.ADMIN}:
        raise ForbiddenError("Acción no permitida para tu rol.")
    return current_user
