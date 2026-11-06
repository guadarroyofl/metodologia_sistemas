"""Acceso a datos de usuarios y tokens de recuperación."""
from __future__ import annotations

import math
from datetime import datetime

from sqlalchemy import func, or_, select

from app.models.enums import UserRole
from app.models.user import PasswordResetToken, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(func.lower(User.email) == email.strip().lower())
        return self.db.scalar(statement)

    def list_users(
        self,
        *,
        search: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[User], int]:
        conditions = []
        if search:
            term = f"%{search.strip().lower()}%"
            conditions.append(
                or_(
                    func.lower(User.name).like(term),
                    func.lower(User.email).like(term),
                )
            )
        if role is not None:
            conditions.append(User.role == role)
        if is_active is not None:
            conditions.append(User.is_active.is_(is_active))

        total = self.db.scalar(select(func.count(User.id)).where(*conditions)) or 0
        statement = (
            select(User)
            .where(*conditions)
            .order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(self.db.scalars(statement)), int(total)

    def count_active_admins(self) -> int:
        return int(
            self.db.scalar(
                select(func.count(User.id)).where(
                    User.role == UserRole.ADMIN, User.is_active.is_(True)
                )
            )
            or 0
        )

    def add_reset_token(self, token: PasswordResetToken) -> PasswordResetToken:
        self.db.add(token)
        self.db.flush()
        return token

    def get_reset_token(self, token_hash: str) -> PasswordResetToken | None:
        return self.db.scalar(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )

    def invalidate_user_tokens(self, user_id: int, now: datetime) -> None:
        tokens = self.db.scalars(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user_id,
                PasswordResetToken.used_at.is_(None),
            )
        )
        for token in tokens:
            token.used_at = now


def paginate(total: int, page: int, page_size: int) -> dict[str, int]:
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, math.ceil(total / page_size)) if total else 0,
    }
