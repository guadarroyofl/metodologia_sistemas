"""Evaluador de Precios IA — sistema experto con patrón Strategy.

Combina el costo de compra con multiplicadores de categoría, estado, marca y
demanda de estilos. Es determinista, explicable y no requiere servicios externos.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP

from app.models.enums import ProductCondition

MONEY = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def round_to_990(value: Decimal) -> Decimal:
    """Redondeo psicológico a terminación 990 (ej. 18.400 → 17.990)."""
    if value <= Decimal("990"):
        return Decimal("990.00")
    thousands = int((value / Decimal("1000")).to_integral_value(rounding=ROUND_HALF_UP))
    return Decimal(max(990, thousands * 1000 - 10))


CATEGORY_MARKUP: dict[str, Decimal] = {
    "abrigos": Decimal("2.70"),
    "camperas": Decimal("2.80"),
    "denim": Decimal("2.90"),
    "remeras": Decimal("3.00"),
    "vestidos": Decimal("2.80"),
    "faldas": Decimal("2.70"),
    "pantalones": Decimal("2.80"),
    "sweaters": Decimal("2.70"),
    "calzado": Decimal("2.90"),
    "accesorios": Decimal("3.20"),
    "ropa interior": Decimal("3.00"),
}

CONDITION_MULTIPLIER: dict[ProductCondition, Decimal] = {
    ProductCondition.NUEVO: Decimal("1.18"),
    ProductCondition.EXCELENTE: Decimal("1.12"),
    ProductCondition.MUY_BUENO: Decimal("1.00"),
    ProductCondition.BUENO: Decimal("0.88"),
    ProductCondition.REGULAR: Decimal("0.72"),
}

CONDITION_LABEL = {
    ProductCondition.NUEVO: "nuevo",
    ProductCondition.EXCELENTE: "excelente",
    ProductCondition.MUY_BUENO: "muy bueno",
    ProductCondition.BUENO: "bueno",
    ProductCondition.REGULAR: "regular",
}

BRAND_MULTIPLIER: dict[str, Decimal] = {
    "levi's": Decimal("1.28"),
    "levis": Decimal("1.28"),
    "carhartt": Decimal("1.35"),
    "the north face": Decimal("1.30"),
    "dr. martens": Decimal("1.32"),
    "dr martens": Decimal("1.32"),
    "ralph lauren": Decimal("1.25"),
    "tommy hilfiger": Decimal("1.20"),
    "nike": Decimal("1.22"),
    "adidas": Decimal("1.18"),
    "vans": Decimal("1.15"),
    "converse": Decimal("1.12"),
    "wrangler": Decimal("1.18"),
    "diesel": Decimal("1.18"),
    "guess": Decimal("1.15"),
    "columbia": Decimal("1.15"),
    "burberry": Decimal("1.40"),
    "versace": Decimal("1.45"),
    "chanel": Decimal("1.60"),
    "dior": Decimal("1.55"),
    "saint laurent": Decimal("1.50"),
    "ysl": Decimal("1.50"),
    "zara": Decimal("0.98"),
    "h&m": Decimal("0.90"),
    "uniqlo": Decimal("1.00"),
}

STYLE_MULTIPLIER: dict[str, Decimal] = {
    "vintage": Decimal("1.12"),
    "y2k": Decimal("1.15"),
    "denim": Decimal("1.10"),
    "band tee": Decimal("1.18"),
    "grunge": Decimal("1.10"),
    "boho": Decimal("1.05"),
    "streetwear": Decimal("1.12"),
    "minimal": Decimal("1.00"),
    "preppy": Decimal("1.02"),
    "cottagecore": Decimal("1.08"),
}


# ── Patrón Strategy ────────────────────────────────────────────────────
class PricingStrategy(ABC):
    key: str
    label: str
    factor: Decimal
    confidence_delta: Decimal

    @abstractmethod
    def describe(self) -> str: ...


class ConservativeStrategy(PricingStrategy):
    key = "conservador"
    label = "Conservador"
    factor = Decimal("0.90")
    confidence_delta = Decimal("3")

    def describe(self) -> str:
        return "Prioriza rotación rápida con un precio 10% por debajo del balanceado."


class BalancedStrategy(PricingStrategy):
    key = "balanceado"
    label = "Balanceado"
    factor = Decimal("1.00")
    confidence_delta = Decimal("0")

    def describe(self) -> str:
        return "Equilibra margen y tiempo de venta para stock unitario."


class AggressiveStrategy(PricingStrategy):
    key = "agresivo"
    label = "Agresivo"
    factor = Decimal("1.13")
    confidence_delta = Decimal("-4")

    def describe(self) -> str:
        return "Maximiza el margen; puede requerir más tiempo de exhibición."


STRATEGIES: dict[str, PricingStrategy] = {
    strategy.key: strategy
    for strategy in (ConservativeStrategy(), BalancedStrategy(), AggressiveStrategy())
}


@dataclass
class PriceEvaluation:
    suggested_price: Decimal
    min_price: Decimal
    max_price: Decimal
    estimated_profit: Decimal
    margin_percent: Decimal
    markup: Decimal
    confidence: Decimal
    strategy: str
    rationale: list[str] = field(default_factory=list)


class PriceEvaluator:
    """Calcula un rango de precio defendible y explica cada factor aplicado."""

    def evaluate(
        self,
        *,
        purchase_cost: float,
        category_name: str,
        condition: ProductCondition,
        brand: str | None,
        style_names: list[str],
        strategy_key: str = "balanceado",
    ) -> PriceEvaluation:
        cost = _money(Decimal(str(purchase_cost)))
        strategy = STRATEGIES.get(strategy_key, STRATEGIES["balanceado"])
        rationale: list[str] = []

        category_key = category_name.strip().lower()
        category_factor = CATEGORY_MARKUP.get(category_key, Decimal("2.60"))
        rationale.append(
            f"Categoría {category_name}: multiplicador base {category_factor:.2f}x."
        )

        condition_factor = CONDITION_MULTIPLIER.get(condition, Decimal("1.00"))
        delta_pct = (condition_factor - 1) * 100
        rationale.append(
            f"Estado {CONDITION_LABEL.get(condition, condition.value)}: "
            f"{delta_pct:+.0f}% sobre el precio base."
        )

        brand_factor = Decimal("1.00")
        if brand:
            brand_factor = BRAND_MULTIPLIER.get(brand.strip().lower(), Decimal("1.00"))
            if brand_factor != 1:
                rationale.append(
                    f"Marca {brand}: {((brand_factor - 1) * 100):+.0f}% por demanda de marca."
                )
            else:
                rationale.append(f"Marca {brand}: sin prima adicional (demanda estándar).")
        else:
            rationale.append("Sin marca identificada: se aplica multiplicador neutro.")

        demand_factor = Decimal("1.00")
        normalized_styles = [style.strip().lower() for style in style_names if style.strip()]
        if normalized_styles:
            factors = [STYLE_MULTIPLIER.get(style, Decimal("1.00")) for style in normalized_styles]
            demand_factor = sum(factors) / Decimal(len(factors))
            if demand_factor != 1:
                rationale.append(
                    f"Estilos {', '.join(style_names)}: "
                    f"{((demand_factor - 1) * 100):+.0f}% por tendencia."
                )

        raw_price = cost * category_factor * condition_factor * brand_factor * demand_factor
        adjusted = raw_price * strategy.factor
        suggested = round_to_990(adjusted)
        minimum = round_to_990(adjusted * Decimal("0.82"))
        maximum = round_to_990(adjusted * Decimal("1.24"))
        suggestion_floor = round_to_990(cost * Decimal("1.35"))
        minimum = max(minimum, suggestion_floor)
        if maximum <= suggested:
            maximum = round_to_990(suggested * Decimal("1.15"))
        if minimum >= suggested:
            minimum = round_to_990(suggested * Decimal("0.88"))

        profit = _money(suggested - cost)
        margin = _money((profit / suggested) * 100) if suggested else Decimal("0")
        markup = _money(suggested / cost) if cost else Decimal("0")

        confidence = Decimal("66")
        if brand:
            confidence += Decimal("8")
        if normalized_styles:
            confidence += Decimal("8")
        if category_key in CATEGORY_MARKUP:
            confidence += Decimal("6")
        confidence += strategy.confidence_delta
        confidence = min(Decimal("94"), max(Decimal("55"), confidence))

        rationale.append(
            f"Estrategia {strategy.label.lower()}: {strategy.describe()}"
        )
        rationale.append("Precio redondeado a terminación 990 para percepción de valor.")

        return PriceEvaluation(
            suggested_price=suggested,
            min_price=minimum,
            max_price=maximum,
            estimated_profit=profit,
            margin_percent=margin,
            markup=markup,
            confidence=confidence,
            strategy=strategy.key,
            rationale=rationale,
        )
