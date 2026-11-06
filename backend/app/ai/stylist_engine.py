"""Personal Shopper IA — motor de recomendación de estilo basado en conocimiento.

Detecta intenciones y etiquetas de estilo, puntúa el catálogo disponible y arma
combinations (outfits) explicando por qué cada prenda encaja. Funciona sin claves
de API ni conexión externa, y puede reemplazarse por un LLM en el futuro.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

from app.models.catalog import Product
from app.models.enums import ProductCondition

STYLE_KEYWORDS: dict[str, list[str]] = {
    "vintage": ["vintage", "retro", "clasico", "antiguo", "osetenta", "noventa"],
    "y2k": ["y2k", "2000", "dos mil", "brillo", "metalico", "tendencia"],
    "denim": ["denim", "jean", "jeans", "mezclilla", "vaquero", "denim total"],
    "band tee": ["banda", "band", "rock", "concierto", "musica", "band tee"],
    "grunge": ["grunge", "oscuro", "punk", "rebeld", "cuero"],
    "boho": ["boho", "bohemio", "hippie", "floral", "romantico"],
    "streetwear": ["street", "urbano", "oversize", "buzo", "hoodie", "skater"],
    "minimal": ["minimal", "basico", "simple", "neutro", "sobrio"],
    "preppy": ["preppy", "elegante", "formal", "clasico", "colegial"],
    "cottagecore": ["cottage", "campo", "flores", "romantico", "pastel"],
}

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "abrigos": ["abrigo", "tapado", "trench", "camperon"],
    "camperas": ["campera", "chaqueta", "bomber", "cazadora"],
    "denim": ["jean", "denim", "vaquero"],
    "remeras": ["remera", "camiseta", "tee", "top"],
    "vestidos": ["vestido", "falda vestido"],
    "faldas": ["falda"],
    "pantalones": ["pantalon", "palazzo", "cargo"],
    "sweaters": ["sweater", "pullover", "tejido", "cardigan"],
    "calzado": ["zapato", "zapatilla", "bota", "calzado", "sandalia"],
    "accesorios": ["accesorio", "cartera", "bolso", "cinturon", "bufanda"],
}

STYLE_TIPS: dict[str, str] = {
    "vintage": "Mezclá una prenda statement vintage con básicos neutros para que el look respire.",
    "y2k": "Sumá accesorios metálicos y siluetas ajustadas; el contraste de texturas es clave.",
    "denim": "El denim total look funciona si variás los tonos; sumá calzado retro para cerrar.",
    "band tee": "Equilibrá una remera oversize con una parte de abajo más ajustada o un blazer.",
    "grunge": "Capas, cuero y colores oscuros: el grunge vive en la mezcla de texturas.",
    "boho": "Prendas fluidas, cinturón marcado y accesorios de madera o crochet.",
    "streetwear": "El oversize necesita contraste: una pieza ajustada o un calzado con volumen.",
    "minimal": "Menos de tres colores y cortes limpios; la calidad textil es la protagonista.",
    "preppy": "Camisa, punto y sastrería liviana: clásicos con un detalle inesperado.",
    "cottagecore": "Flores, encaje y tonos pastel; sumá una pieza de cuero para romper lo dulce.",
}

DEFAULT_TIPS = [
    "Priorizá una sola prenda protagonista y construí el look alrededor de ella.",
    "Al ser stock unitario, consultá disponibilidad antes de enamorarte de una pieza.",
    "Medí tus prendas favoritas y compará con la tabla de talles de cada publicación.",
]


def _normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def _tokens(text: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]+", _normalize(text)) if len(token) > 2}


@dataclass
class StylistSuggestionData:
    product: Product
    reason: str
    score: float


@dataclass
class OutfitData:
    title: str
    description: str
    product_ids: list[int]


@dataclass
class StylistResult:
    reply: str
    detected_styles: list[str]
    suggestions: list[StylistSuggestionData] = field(default_factory=list)
    outfits: list[OutfitData] = field(default_factory=list)
    tips: list[str] = field(default_factory=list)


class StylistEngine:
    def recommend(
        self,
        *,
        products: list[Product],
        message: str,
        preferred_styles: list[str],
        size: str | None = None,
        budget_max: float | None = None,
        category_id: int | None = None,
        limit: int = 4,
    ) -> StylistResult:
        normalized_message = _normalize(message)
        message_tokens = _tokens(message)

        detected: list[str] = []
        catalog_styles = {
            style.name.lower(): style.name for product in products for style in product.styles
        }
        for style_key, keywords in STYLE_KEYWORDS.items():
            if any(_normalize(keyword) in normalized_message for keyword in keywords):
                detected.append(style_key)

        for style_name in preferred_styles:
            normalized = _normalize(style_name)
            if normalized and normalized not in detected:
                detected.append(normalized)

        for style_name, style_label in catalog_styles.items():
            if _normalize(style_name) in normalized_message and style_name not in detected:
                detected.append(style_name)

        detected = list(dict.fromkeys(detected))[:4]
        detected_labels = [catalog_styles.get(style, style.title()) for style in detected]

        requested_category_names = [
            category
            for category, words in CATEGORY_KEYWORDS.items()
            if any(_normalize(word) in normalized_message for word in words)
        ]

        candidates: list[StylistSuggestionData] = []
        for product in products:
            product_styles = {_normalize(style.name) for style in product.styles}
            score = 0.0
            reasons: list[str] = []

            if budget_max and float(product.price) > budget_max * 1.15:
                continue

            matched = [style for style in detected if style in product_styles]
            if matched:
                score += 22 * len(matched)
                labels = [style.title() for style in matched]
                reasons.append(f"Coincide con tu interés por {', '.join(labels)}")

            searchable = " ".join(
                filter(
                    None,
                    [
                        product.name,
                        product.description,
                        product.brand or "",
                        product.color or "",
                        product.category.name,
                        " ".join(style.name for style in product.styles),
                    ],
                )
            )
            searchable_tokens = _tokens(searchable)
            keyword_hits = message_tokens & searchable_tokens
            if keyword_hits:
                score += min(12, 3 * len(keyword_hits))
                reasons.append(f"Relacionado con: {', '.join(sorted(keyword_hits)[:3])}")

            if category_id and product.category_id == category_id:
                score += 14
                reasons.append(f"Pertenence a la categoría {product.category.name}")

            if requested_category_names and _normalize(product.category.name) in {
                _normalize(category) for category in requested_category_names
            }:
                score += 12
                reasons.append(f"Es una {product.category.name.lower()} como buscabas")

            if size:
                if product.size and _normalize(product.size) == _normalize(size):
                    score += 12
                    reasons.append(f"Talle {product.size} disponible")
                elif product.size and _normalize(size) not in _normalize(product.size):
                    score -= 6

            if budget_max:
                if float(product.price) <= budget_max:
                    score += 8
                    reasons.append("Dentro de tu presupuesto")

            if product.is_featured:
                score += 3
            if product.condition in {ProductCondition.NUEVO, ProductCondition.EXCELENTE}:
                score += 2

            if not reasons:
                reasons.append("Pieza destacada de la curaduría CAOS")

            candidates.append(
                StylistSuggestionData(
                    product=product,
                    reason=" · ".join(reasons[:2]),
                    score=round(score, 2),
                )
            )

        candidates.sort(key=lambda item: (item.score, float(item.product.price)), reverse=True)
        selected = candidates[:limit]

        if not selected:
            selected = [
                StylistSuggestionData(
                    product=product,
                    reason="Una pieza disponible de nuestra curaduría",
                    score=0.0,
                )
                for product in products[:limit]
            ]

        outfits = self._build_outfits(selected, detected_labels)
        tips = self._build_tips(detected)
        reply = self._build_reply(selected, detected_labels, budget_max, category_id)

        return StylistResult(
            reply=reply,
            detected_styles=detected_labels,
            suggestions=selected,
            outfits=outfits,
            tips=tips,
        )

    def _build_outfits(
        self, suggestions: list[StylistSuggestionData], styles: list[str]
    ) -> list[OutfitData]:
        if not suggestions:
            return []
        style_label = styles[0] if styles else "CAOS"
        products = [item.product for item in suggestions]

        first = products[0]
        companions = [product for product in products[1:] if product.category_id != first.category_id]
        primary_ids = [first.id] + [product.id for product in companions[:2]]
        primary_names = [first.name] + [product.name for product in companions[:2]]
        outfits = [
            OutfitData(
                title=f"Look {style_label} principal",
                description=(
                    "Combiná " + " + ".join(primary_names) +
                    ". Mantené la paleta en dos o tres tonos para un resultado editorial."
                ),
                product_ids=primary_ids,
            )
        ]

        if len(products) >= 2:
            second_base = products[1]
            second_companions = [
                product
                for product in products[2:]
                if product.category_id not in {second_base.category_id, first.category_id}
            ]
            second_ids = [second_base.id] + [product.id for product in second_companions[:1]]
            outfits.append(
                OutfitData(
                    title="Alternativa para otro plan",
                    description=(
                        f"Si preferís algo más {'oscuro' if 'grunge' in styles else 'relajado'}, "
                        f"partí de {second_base.name} y sumá un accesorio que aporte contraste."
                    ),
                    product_ids=second_ids,
                )
            )
        return outfits

    @staticmethod
    def _build_tips(styles: list[str]) -> list[str]:
        tips = [STYLE_TIPS[style] for style in styles if style in STYLE_TIPS]
        return (tips + DEFAULT_TIPS)[:3]

    @staticmethod
    def _build_reply(
        suggestions: list[StylistSuggestionData],
        styles: list[str],
        budget_max: float | None,
        category_id: int | None,
    ) -> str:
        if not suggestions:
            return (
                "Hoy no encontré piezas que encajen exactamente con lo que buscás. "
                "Probá con otro estilo o ampliá el presupuesto: el stock es unitario y se renueva."
            )
        style_text = f" Estilo detectado: {', '.join(styles)}." if styles else ""
        budget_text = f" Filtrado por un presupuesto de ${budget_max:,.0f}.".replace(",", ".") if budget_max else ""
        category_text = " Priorizando la categoría que mencionaste." if category_id else ""
        names = ", ".join(item.product.name for item in suggestions[:2])
        return (
            f"¡Hola! Soy el Personal Shopper de CAOS.{style_text}{budget_text}{category_text} "
            f"Encontré {len(suggestions)} piezas que pueden funcionar; empecemos por {names}. "
            "Cada prenda es única, así que si te gusta una, conviene reservarla pronto."
        )
