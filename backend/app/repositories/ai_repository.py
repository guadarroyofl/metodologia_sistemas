"""Persistencia de sugerencias del Evaluador de Precios IA."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ai import PriceSuggestion


class PriceSuggestionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, suggestion: PriceSuggestion) -> PriceSuggestion:
        self.db.add(suggestion)
        self.db.flush()
        return suggestion

    def recent(self, user_id: int, limit: int = 12) -> list[PriceSuggestion]:
        return list(
            self.db.scalars(
                select(PriceSuggestion)
                .where(PriceSuggestion.user_id == user_id)
                .order_by(PriceSuggestion.created_at.desc())
                .limit(limit)
            )
        )
