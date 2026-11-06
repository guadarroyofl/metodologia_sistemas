"""Importación central de modelos para registrar la metadata y resolver relaciones."""
from app.models.ai import PriceSuggestion
from app.models.catalog import Category, Product, Style, product_styles
from app.models.enums import (
    MovementType,
    PaymentMethod,
    ProductCondition,
    ProductStatus,
    SaleStatus,
    UserRole,
)
from app.models.inventory import InventoryMovement
from app.models.sale import Sale, SaleItem
from app.models.user import PasswordResetToken, User

__all__ = [
    "Category",
    "InventoryMovement",
    "MovementType",
    "PasswordResetToken",
    "PaymentMethod",
    "PriceSuggestion",
    "Product",
    "ProductCondition",
    "ProductStatus",
    "Sale",
    "SaleItem",
    "SaleStatus",
    "Style",
    "User",
    "UserRole",
    "product_styles",
]
