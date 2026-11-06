"""Esquemas del catálogo de prendas, categorías y estilos."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import ProductCondition, ProductStatus


class CategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.split())


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=500)


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None = None
    created_at: datetime


class StyleIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    description: str | None = Field(default=None, max_length=500)


class StyleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=60)
    description: str | None = Field(default=None, max_length=500)


class StyleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None = None


class ProductIn(BaseModel):
    name: str = Field(min_length=3, max_length=160)
    description: str = Field(default="", max_length=4000)
    category_id: int = Field(gt=0)
    brand: str | None = Field(default=None, max_length=80)
    size: str | None = Field(default=None, max_length=20)
    color: str | None = Field(default=None, max_length=50)
    condition: ProductCondition = ProductCondition.MUY_BUENO
    status: ProductStatus = ProductStatus.AVAILABLE
    purchase_cost: float = Field(gt=0, le=100_000_000)
    price: float = Field(gt=0, le=100_000_000)
    image_url: str | None = Field(default=None, max_length=500)
    is_featured: bool = False
    style_ids: list[int] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("style_ids")
    @classmethod
    def unique_styles(cls, value: list[int]) -> list[int]:
        return list(dict.fromkeys(value))

    @model_validator(mode="after")
    def margins_are_coherent(self) -> "ProductIn":
        if self.price <= self.purchase_cost:
            raise ValueError("El precio de venta debe ser mayor al costo de compra.")
        return self


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    category_id: int | None = Field(default=None, gt=0)
    brand: str | None = Field(default=None, max_length=80)
    size: str | None = Field(default=None, max_length=20)
    color: str | None = Field(default=None, max_length=50)
    condition: ProductCondition | None = None
    status: ProductStatus | None = None
    purchase_cost: float | None = Field(default=None, gt=0, le=100_000_000)
    price: float | None = Field(default=None, gt=0, le=100_000_000)
    image_url: str | None = Field(default=None, max_length=500)
    is_featured: bool | None = None
    is_active: bool | None = None
    style_ids: list[int] | None = None

    @field_validator("style_ids")
    @classmethod
    def unique_styles(cls, value: list[int] | None) -> list[int] | None:
        return list(dict.fromkeys(value)) if value is not None else None


class ProductPublicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    name: str
    description: str
    category: CategoryOut
    brand: str | None
    size: str | None
    color: str | None
    condition: ProductCondition
    status: ProductStatus
    price: float
    image_url: str | None
    is_featured: bool
    styles: list[StyleOut] = Field(default_factory=list)
    available: bool
    created_at: datetime


class AdminProductOut(ProductPublicOut):
    purchase_cost: float
    margin_amount: float
    margin_percent: float
    is_active: bool
    updated_at: datetime


class ProductPage(BaseModel):
    items: list[ProductPublicOut]
    total: int
    page: int
    page_size: int
    pages: int


class AdminProductPage(BaseModel):
    items: list[AdminProductOut]
    total: int
    page: int
    page_size: int
    pages: int
