"""Esquemas de ventas, checkout y detalle de transacciones."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import PaymentMethod, SaleStatus


class SaleItemCreate(BaseModel):
    product_id: int = Field(gt=0)


class SaleCreate(BaseModel):
    items: list[SaleItemCreate] = Field(min_length=1, max_length=20)
    payment_method: PaymentMethod = PaymentMethod.TRANSFER
    discount: float = Field(default=0, ge=0)
    notes: str | None = Field(default=None, max_length=1000)
    customer_name: str | None = Field(default=None, max_length=120)
    customer_email: EmailStr | None = None

    @field_validator("items")
    @classmethod
    def unique_products(cls, value: list[SaleItemCreate]) -> list[SaleItemCreate]:
        ids = [item.product_id for item in value]
        if len(ids) != len(set(ids)):
            raise ValueError("Cada prenda es única: no se puede repetir un producto en la misma venta.")
        return value


class SaleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    line_total: float


class AdminSaleItemOut(SaleItemOut):
    unit_cost: float
    line_profit: float


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    status: SaleStatus
    payment_method: PaymentMethod
    subtotal: float
    discount: float
    total: float
    customer_name: str | None
    customer_email: EmailStr | None
    notes: str | None
    items: list[SaleItemOut]
    total_items: int
    created_at: datetime


class AdminSaleOut(SaleOut):
    user_id: int
    sold_by_id: int | None
    customer_name: str | None
    items: list[AdminSaleItemOut]
    total_cost: float
    total_profit: float
    margin_percent: float


class SaleCancelIn(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class SalePage(BaseModel):
    items: list[SaleOut]
    total: int
    page: int
    page_size: int
    pages: int


class AdminSalePage(BaseModel):
    items: list[AdminSaleOut]
    total: int
    page: int
    page_size: int
    pages: int
