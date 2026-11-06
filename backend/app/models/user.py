"""Modelos de usuarios, roles y recuperación de contraseña."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import UserRole


def _user_role_enum() -> SAEnum:
    return SAEnum(
        UserRole,
        values_callable=lambda enum_cls: [item.value for item in enum_cls],
        native_enum=False,
        create_constraint=True,
        length=20,
        name="ck_user_role",
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_email", "email", unique=True),
        Index("ix_users_role_active", "role", "is_active"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(_user_role_enum(), default=UserRole.CLIENT, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    password_resets: Mapped[list[PasswordResetToken]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    sales: Mapped[list["Sale"]] = relationship(  # noqa: F821
        back_populates="customer", foreign_keys="Sale.user_id"
    )
    price_suggestions: Mapped[list["PriceSuggestion"]] = relationship(  # noqa: F821
        back_populates="created_by_user", passive_deletes=True
    )


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    __table_args__ = (Index("ix_password_reset_user", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    user: Mapped[User] = relationship(back_populates="password_resets")
