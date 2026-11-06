"""ABM de usuarios para el panel administrador."""
from __future__ import annotations

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserAdminUpdate, UserCreateIn
from app.services.base_service import BaseService


class UserService(BaseService):
    def __init__(self, db) -> None:  # noqa: ANN001
        super().__init__(db)
        self.users = UserRepository(db)

    def list_users(
        self,
        *,
        search: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[User], int]:
        page = max(1, page)
        page_size = min(100, max(1, page_size))
        return self.users.list_users(
            search=search, role=role, is_active=is_active, page=page, page_size=page_size
        )

    def get_user(self, user_id: int) -> User:
        user = self.users.get(user_id)
        if user is None:
            raise NotFoundError("Usuario no encontrado.")
        return user

    def create_user(self, payload: UserCreateIn) -> User:
        email = payload.email.lower().strip()
        if self.users.get_by_email(email):
            raise ConflictError("Ya existe un usuario con ese correo.")
        user = User(
            name=payload.name,
            email=email,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
            role=payload.role,
            is_active=True,
        )
        self.db.add(user)
        self.commit("No se pudo crear el usuario: verificá el correo.")
        self.db.refresh(user)
        return user

    def update_user(self, actor: User, user_id: int, payload: UserAdminUpdate) -> User:
        user = self.get_user(user_id)
        data = payload.model_dump(exclude_unset=True)

        if "email" in data and data["email"]:
            email = str(data["email"]).lower().strip()
            existing = self.users.get_by_email(email)
            if existing and existing.id != user.id:
                raise ConflictError("Ese correo ya pertenece a otro usuario.")
            data["email"] = email

        if "password" in data:
            password = data.pop("password")
            if password:
                user.password_hash = hash_password(password)

        requested_role = data.get("role", user.role)
        requested_active = data.get("is_active", user.is_active)
        if user.id == actor.id:
            if requested_role != user.role:
                raise BusinessRuleError("No podés cambiar tu propio rol.")
            if requested_active is False:
                raise BusinessRuleError("No podés desactivar tu propia cuenta.")

        was_active_admin = user.role == UserRole.ADMIN and user.is_active
        losing_admin = requested_role != UserRole.ADMIN or requested_active is False
        if was_active_admin and losing_admin and self.users.count_active_admins() <= 1:
            raise BusinessRuleError("Debe quedar al menos un administrador activo en el sistema.")

        for field, value in data.items():
            setattr(user, field, value)

        self.commit("No se pudo actualizar el usuario.")
        self.db.refresh(user)
        return user

    def deactivate_user(self, actor: User, user_id: int) -> User:
        user = self.get_user(user_id)
        if user.id == actor.id:
            raise BusinessRuleError("No podés desactivar tu propia cuenta.")
        if not user.is_active:
            return user
        if user.role == UserRole.ADMIN and self.users.count_active_admins() <= 1:
            raise BusinessRuleError("Debe quedar al menos un administrador activo en el sistema.")
        user.is_active = False
        self.commit("No se pudo desactivar el usuario.")
        self.db.refresh(user)
        return user
