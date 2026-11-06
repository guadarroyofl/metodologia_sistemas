"""Esquemas utilitarios compartidos."""
from pydantic import BaseModel


class MessageOut(BaseModel):
    message: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: object | None = None
