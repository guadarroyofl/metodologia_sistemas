"""Controlador de los módulos de IA: Personal Shopper y Evaluador de Precios."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.ai import PricingHistoryItem, PricingIn, PricingOut, StylistIn, StylistOut
from app.services.pricing_service import PricingService
from app.services.stylist_service import StylistService

router = APIRouter(prefix="/ai", tags=["Módulos IA"])


@router.post(
    "/stylist",
    response_model=StylistOut,
    summary="Personal Shopper: recomendaciones y outfits según estilo",
)
def stylist(payload: StylistIn, db: Session = Depends(get_db)) -> StylistOut:
    return StylistService(db).recommend(payload)


@router.post(
    "/pricing",
    response_model=PricingOut,
    summary="Evaluador de precios con margen y explicación (admin)",
)
def evaluate_price(
    payload: PricingIn,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PricingOut:
    return PricingService(db).evaluate(payload, current_user)


@router.get(
    "/pricing/history",
    response_model=list[PricingHistoryItem],
    summary="Historial de sugerencias de precio (admin)",
)
def pricing_history(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[PricingHistoryItem]:
    return [
        PricingHistoryItem.model_validate(item)
        for item in PricingService(db).history(current_user)
    ]
