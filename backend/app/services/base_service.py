"""Servicio base con utilidades de transacción y paginación."""
from __future__ import annotations

import math

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ConflictError


class BaseService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def commit(self, conflict_message: str = "La operación entra en conflicto con datos existentes.") -> None:
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError(conflict_message) from exc
        except SQLAlchemyError as exc:
            self.db.rollback()
            raise AppError(
                "Ocurrió un error al guardar los cambios. Intentá nuevamente.",
                status_code=500,
                code="database_error",
            ) from exc

    def rollback(self) -> None:
        self.db.rollback()

    @staticmethod
    def pages(total: int, page_size: int) -> int:
        return max(1, math.ceil(total / page_size)) if total else 0
