"""Enumeraciones de dominio compartidas por modelos y esquemas."""
from __future__ import annotations

from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    CLIENT = "client"


class ProductCondition(str, Enum):
    NUEVO = "nuevo"
    EXCELENTE = "excelente"
    MUY_BUENO = "muy_bueno"
    BUENO = "bueno"
    REGULAR = "regular"


class ProductStatus(str, Enum):
    AVAILABLE = "available"
    SOLD = "sold"
    RESERVED = "reserved"
    ARCHIVED = "archived"


class SaleStatus(str, Enum):
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    CASH = "cash"
    TRANSFER = "transfer"
    CARD = "card"
    MERCADOPAGO = "mercadopago"


class MovementType(str, Enum):
    ENTRY = "entry"
    SALE = "sale"
    RETURN = "return"
    ADJUSTMENT = "adjustment"
