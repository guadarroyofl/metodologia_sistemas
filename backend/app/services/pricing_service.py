"""Servicio del Evaluador de Precios IA: orquesta motor, persistencia y validación."""
from __future__ import annotations

import json
from decimal import Decimal

from app.ai.pricing_engine import PriceEvaluator
from app.core.exceptions import NotFoundError
from app.models.ai import PriceSuggestion
from app.models.user import User
from app.repositories.ai_repository import PriceSuggestionRepository
from app.repositories.catalog_repository import CatalogRepository
from app.schemas.ai import PricingIn, PricingOut
from app.services.base_service import BaseService

DISCLAIMER = (
    "Sugerencia orientativa calculada con reglas de negocio, estado, marca y tendencia. "
    "El precio final debe considerar demanda real, competencia y contexto de venta."
)


class PricingService(BaseService):
    def __init__(self, db) -> None:  # noqa: ANN001
        super().__init__(db)
        self.catalog = CatalogRepository(db)
        self.history_repo = PriceSuggestionRepository(db)
        self.engine = PriceEvaluator()

    @staticmethod
    def _money(value: Decimal) -> float:
        return round(float(value), 2)

    def evaluate(self, payload: PricingIn, actor: User) -> PricingOut:
        category = self.catalog.get_category(payload.category_id)
        if category is None:
            raise NotFoundError("La categoría seleccionada no existe.")
        styles = self.catalog.get_styles_by_ids(payload.style_ids)
        if len(styles) != len(set(payload.style_ids)):
            raise NotFoundError("Uno o más estilos seleccionados no existen.")

        product = None
        if payload.product_id is not None:
            product = self.catalog.get_product(payload.product_id)
            if product is None:
                raise NotFoundError("La prenda seleccionada no existe.")

        evaluation = self.engine.evaluate(
            purchase_cost=payload.purchase_cost,
            category_name=category.name,
            condition=payload.condition,
            brand=payload.brand,
            style_names=[style.name for style in styles],
            strategy_key=payload.strategy,
        )

        suggestion = PriceSuggestion(
            user_id=actor.id,
            product_id=product.id if product else None,
            strategy=evaluation.strategy,
            category_name=category.name,
            condition=payload.condition,
            brand=payload.brand,
            purchase_cost=Decimal(str(payload.purchase_cost)).quantize(Decimal("0.01")),
            suggested_price=evaluation.suggested_price,
            min_price=evaluation.min_price,
            max_price=evaluation.max_price,
            estimated_profit=evaluation.estimated_profit,
            margin_percent=evaluation.margin_percent,
            confidence=evaluation.confidence,
            rationale=json.dumps(evaluation.rationale, ensure_ascii=False),
        )
        self.history_repo.add(suggestion)
        self.commit("No se pudo guardar la sugerencia de precio.")

        return PricingOut(
            suggested_price=self._money(evaluation.suggested_price),
            min_price=self._money(evaluation.min_price),
            max_price=self._money(evaluation.max_price),
            estimated_profit=self._money(evaluation.estimated_profit),
            margin_percent=self._money(evaluation.margin_percent),
            markup=self._money(evaluation.markup),
            confidence=self._money(evaluation.confidence),
            strategy=evaluation.strategy,  # type: ignore[arg-type]
            category_name=category.name,
            rationale=evaluation.rationale,
            disclaimer=DISCLAIMER,
            suggestion_id=suggestion.id,
        )

    def history(self, actor: User) -> list[PriceSuggestion]:
        return self.history_repo.recent(actor.id)
