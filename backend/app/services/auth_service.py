"""Servicios de autenticación, registro y recuperación de contraseña."""
from __future__ import annotations

from dataclasses import dataclass

from app.core.config import settings
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    hash_token,
    reset_token_expiry,
    utcnow,
    verify_password,
)
from app.models.enums import UserRole
from app.models.user import PasswordResetToken, User
from app.repositories.user_repository import UserRepository
from app.schemas.user import (
    ChangePasswordIn,
    ForgotPasswordIn,
    LoginIn,
    ProfileUpdate,
    RegisterIn,
    ResetPasswordIn,
)
from app.services.base_service import BaseService


@dataclass
class AuthResult:
    access_token: str
    expires_in: int
    user: User


class AuthService(BaseService):
    def __init__(self, db) -> None:  # noqa: ANN001
        super().__init__(db)
        self.users = UserRepository(db)

    def _issue_token(self, user: User) -> AuthResult:
        token = create_access_token(user.id, user.role.value, {"email": user.email})
        return AuthResult(
            access_token=token,
            expires_in=settings.access_token_expire_minutes * 60,
            user=user,
        )

    def register(self, payload: RegisterIn) -> AuthResult:
        email = payload.email.lower().strip()
        if self.users.get_by_email(email):
            raise ConflictError("Ya existe una cuenta registrada con ese correo.")
        user = User(
            name=payload.name,
            email=email,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
            role=UserRole.CLIENT,
            is_active=True,
        )
        self.db.add(user)
        self.commit("No se pudo crear la cuenta: el correo ya está registrado.")
        self.db.refresh(user)
        return self._issue_token(user)

    def login(self, payload: LoginIn) -> AuthResult:
        user = self.users.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedError("Correo o contraseña incorrectos.", code="invalid_credentials")
        if not user.is_active:
            raise ForbiddenError("Tu cuenta está desactivada. Contactá a la administradora.", code="inactive_user")
        return self._issue_token(user)

    def forgot_password(self, payload: ForgotPasswordIn) -> tuple[str, str | None]:
        user = self.users.get_by_email(payload.email)
        generic_message = (
            "Si el correo está registrado, te enviamos las instrucciones para restablecer la contraseña."
        )
        if user is None or not user.is_active:
            return generic_message, None

        now = utcnow()
        self.users.invalidate_user_tokens(user.id, now)
        raw_token, token_hash = generate_reset_token()
        self.users.add_reset_token(
            PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=reset_token_expiry(),
                created_at=now,
            )
        )
        self.commit("No se pudo generar el token de recuperación.")
        # En producción este token se enviaría por email; en desarrollo se expone.
        exposed = raw_token if settings.environment == "development" else None
        return generic_message, exposed

    def reset_password(self, payload: ResetPasswordIn) -> str:
        token = self.users.get_reset_token(hash_token(payload.token))
        if token is None or token.used_at is not None:
            raise ValidationError("El token de recuperación es inválido o ya fue utilizado.", code="invalid_reset_token")
        if token.expires_at < utcnow():
            raise ValidationError("El token de recuperación expiró. Solicitá uno nuevo.", code="expired_reset_token")
        user = self.users.get(token.user_id)
        if user is None or not user.is_active:
            raise NotFoundError("La cuenta asociada ya no está disponible.")

        now = utcnow()
        user.password_hash = hash_password(payload.new_password)
        self.users.invalidate_user_tokens(user.id, now)
        token.used_at = now
        self.commit("No se pudo actualizar la contraseña.")
        return "Contraseña actualizada correctamente. Ya podés iniciar sesión."

    def change_password(self, user: User, payload: ChangePasswordIn) -> str:
        if not verify_password(payload.current_password, user.password_hash):
            raise ValidationError("La contraseña actual no es correcta.", code="wrong_current_password")
        if verify_password(payload.new_password, user.password_hash):
            raise ValidationError("La nueva contraseña debe ser diferente a la actual.")
        user.password_hash = hash_password(payload.new_password)
        self.commit("No se pudo actualizar la contraseña.")
        return "Contraseña actualizada correctamente."

    def update_profile(self, user: User, payload: ProfileUpdate) -> User:
        data = payload.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(user, field, value)
        self.commit("No se pudo actualizar el perfil.")
        self.db.refresh(user)
        return user
