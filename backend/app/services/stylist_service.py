"""Servicio del Personal Shopper IA: adapta el catálogo al motor de recomendación."""
from __future__ import annotations

from app.ai.stylist_engine import StylistEngine
from app.repositories.catalog_repository import CatalogRepository
from app.schemas.ai import OutfitSuggestion, StylistIn, StylistOut, StylistSuggestion
from app.schemas.catalog import ProductPublicOut
from app.services.base_service import BaseService


class StylistService(BaseService):
    def __init__(self, db) -> None:  # noqa: ANN001
        super().__init__(db)
        self.catalog = CatalogRepository(db)
        self.engine = StylistEngine()

    def recommend(self, payload: StylistIn) -> StylistOut:
        products = self.catalog.list_available_for_ai()
        result = self.engine.recommend(
            products=products,
            message=payload.message,
            preferred_styles=payload.preferred_styles,
            size=payload.size,
            budget_max=payload.budget_max,
            category_id=payload.category_id,
            limit=payload.limit,
        )

        suggestions = [
            StylistSuggestion(
                product=ProductPublicOut.model_validate(item.product),
                reason=item.reason,
                score=item.score,
            )
            for item in result.suggestions
        ]
        outfits = [
            OutfitSuggestion(
                title=outfit.title,
                description=outfit.description,
                product_ids=outfit.product_ids,
            )
            for outfit in result.outfits
        ]
        return StylistOut(
            reply=result.reply,
            detected_styles=result.detected_styles,
            suggestions=suggestions,
            outfits=outfits,
            tips=result.tips,
        )
