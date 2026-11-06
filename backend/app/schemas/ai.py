"""Esquemas de los módulos de IA: Personal Shopper y Evaluador de Precios."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ProductCondition
from app.schemas.catalog import ProductPublicOut

PricingStrategy = Literal["conservador", "balanceado", "agresivo"]


class StylistIn(BaseModel):
    message: str = Field(min_length=2, max_length=600)
    preferred_styles: list[str] = Field(default_factory=list, max_length=8)
    size: str | None = Field(default=None, max_length=20)
    budget_max: float | None = Field(default=None, gt=0)
    category_id: int | None = Field(default=None, gt=0)
    limit: int = Field(default=4, ge=1, le=8)


class StylistSuggestion(BaseModel):
    product: ProductPublicOut
    reason: str
    score: float


class OutfitSuggestion(BaseModel):
    title: str
    description: str
    product_ids: list[int]


class StylistOut(BaseModel):
    reply: str
    detected_styles: list[str]
    suggestions: list[StylistSuggestion]
    outfits: list[OutfitSuggestion]
    tips: list[str]


class PricingIn(BaseModel):
    purchase_cost: float = Field(gt=0, le=100_000_000)
    category_id: int = Field(gt=0)
    condition: ProductCondition = ProductCondition.MUY_BUENO
    brand: str | None = Field(default=None, max_length=80)
    style_ids: list[int] = Field(default_factory=list)
    strategy: PricingStrategy = "balanceado"
    product_id: int | None = Field(default=None, gt=0)


class PricingOut(BaseModel):
    suggested_price: float
    min_price: float
    max_price: float
    estimated_profit: float
    margin_percent: float
    markup: float
    confidence: float
    strategy: PricingStrategy
    category_name: str
    rationale: list[str]
    disclaimer: str
    suggestion_id: int | None = None


class PricingHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    strategy: str
    category_name: str
    condition: ProductCondition
    brand: str | None
    purchase_cost: float
    suggested_price: float
    estimated_profit: float
    margin_percent: float
    confidence: float
    created_at: datetime
