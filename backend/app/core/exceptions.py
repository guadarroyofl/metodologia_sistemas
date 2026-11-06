"""Excepciones de dominio y su representación HTTP uniforme."""
from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Error de negocio controlado. El manejador global lo traduce a JSON."""

    status_code: int = 400
    code: str = "application_error"

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        code: str | None = None,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code
        self.details = details


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class BusinessRuleError(AppError):
    status_code = 400
    code = "business_rule_error"


class ExportError(AppError):
    status_code = 500
    code = "export_error"
