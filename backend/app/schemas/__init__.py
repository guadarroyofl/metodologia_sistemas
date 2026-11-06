"""Reexportación de esquemas para importaciones breves."""
from app.schemas.ai import PricingIn, PricingOut, StylistIn, StylistOut
from app.schemas.catalog import (
    AdminProductOut,
    CategoryIn,
    CategoryOut,
    CategoryUpdate,
    ProductIn,
    ProductPublicOut,
    ProductUpdate,
    StyleIn,
    StyleOut,
    StyleUpdate,
)
from app.schemas.sale import SaleCreate, SaleOut
from app.schemas.user import (
    ChangePasswordIn,
    ForgotPasswordIn,
    LoginIn,
    RegisterIn,
    TokenOut,
    UserOut,
)

__all__ = [
    "AdminProductOut",
    "CategoryIn",
    "CategoryOut",
    "CategoryUpdate",
    "ChangePasswordIn",
    "ForgotPasswordIn",
    "LoginIn",
    "PricingIn",
    "PricingOut",
    "ProductIn",
    "ProductPublicOut",
    "ProductUpdate",
    "RegisterIn",
    "SaleCreate",
    "SaleOut",
    "StyleIn",
    "StyleOut",
    "StyleUpdate",
    "StylistIn",
    "StylistOut",
    "TokenOut",
    "UserOut",
]
