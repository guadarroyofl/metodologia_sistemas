"""Esquemas de usuarios, autenticación y perfil."""
from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import UserRole

_PASSWORD_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,128}$")


def validate_password_strength(value: str) -> str:
    if not _PASSWORD_RE.match(value):
        raise ValueError("La contraseña debe tener al menos 8 caracteres, una letra y un número.")
    return value


class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("El nombre es demasiado corto.")
        return value


class RegisterIn(UserBase):
    password: str = Field(min_length=8, max_length=128)

    _validate_password = field_validator("password")(validate_password_strength)


class UserCreateIn(UserBase):
    """Alta de usuario desde el panel administrador (permite asignar rol)."""

    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.CLIENT

    _validate_password = field_validator("password")(validate_password_strength)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserOut"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: UserRole
    phone: str | None = None
    is_active: bool
    created_at: datetime


class UserAdminUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def check_password(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_password_strength(value)


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=40)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    _validate_new_password = field_validator("new_password")(validate_password_strength)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ForgotPasswordOut(BaseModel):
    message: str
    reset_token: str | None = Field(
        default=None,
        description="Sólo en entorno de desarrollo: token para probar el flujo sin correo.",
    )


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=10, max_length=256)
    new_password: str = Field(min_length=8, max_length=128)

    _validate_new_password = field_validator("new_password")(validate_password_strength)


class UserPage(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    page_size: int
    pages: int


TokenOut.model_rebuild()
