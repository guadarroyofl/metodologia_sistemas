"""Carga inicial idempotente: usuarios demo, catálogo, ventas y trazabilidad.

Uso:
    python -m app.db.seed
"""
from __future__ import annotations

import json
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import func, select

from app.core.security import hash_password, utcnow
from app.db.session import SessionLocal, create_tables
from app.models import (
    Category,
    InventoryMovement,
    MovementType,
    PaymentMethod,
    PriceSuggestion,
    Product,
    ProductCondition,
    ProductStatus,
    Sale,
    SaleItem,
    SaleStatus,
    Style,
    User,
    UserRole,
)

ADMIN_PASSWORD = "CaosAdmin2026!"
CLIENT_PASSWORD = "Cliente2026!"


CATEGORIES = [
    ("Abrigos", "Tapados, trenchs y abrigos de temporada."),
    ("Camperas", "Camperas de cuero, denim, bomber y sastrería."),
    ("Denim", "Jeans, camisas y chaquetas de jean."),
    ("Remeras", "Tops, remeras y band tees."),
    ("Vestidos", "Vestidos únicos de distintas décadas."),
    ("Faldas", "Faldas midi, mini y plisadas."),
    ("Pantalones", "Cargo, sastreros y palazzo."),
    ("Sweaters", "Tejidos, hoodies y pullovers."),
    ("Calzado", "Botas, zapatillas y calzado de autor."),
    ("Accesorios", "Carteras, cinturones y complementos."),
]

STYLES = [
    ("Vintage", "Piezas con historia, de los 70s a los 90s."),
    ("Y2K", "Estética de los 2000: brillo, denim y siluetas ajustadas."),
    ("Denim", "El universo del jean en todas sus formas."),
    ("Band Tee", "Remeras de bandas y cultura musical."),
    ("Grunge", "Cuero, capas y paletas oscuras."),
    ("Boho", "Fluidez, flores y espíritu bohemio."),
    ("Streetwear", "Oversize, urbano y deportivo."),
    ("Minimal", "Líneas limpias y básicos de calidad."),
    ("Preppy", "Clásicos colegiales y sastrería."),
    ("Cottagecore", "Romanticismo, encaje y tonos pastel."),
]

IMAGE_BASE = "https://images.unsplash.com/"
IMAGE_QUERY = "?auto=format&fit=crop&w=900&q=80"
IMAGES = [
    "photo-1551028719-00167b16eac5",
    "photo-1542272604-787c3835535d",
    "photo-1576566588028-4147f3842f27",
    "photo-1595777457583-95e059d581b8",
    "photo-1539533018447-63fcce2678e3",
    "photo-1544022613-e87ca75a784a",
    "photo-1521572163474-6864f9cf17ab",
    "photo-1473966968600-fa801b869a1a",
    "photo-1585487000160-6ebcfceb0d03",
    "photo-1582142839970-2b9e04b60f65",
    "photo-1556821840-3a63f95609a7",
    "photo-1608256246200-53e635b5b65f",
    "photo-1548036328-c9fa89d128fa",
    "photo-1598033129183-c4f50c736f10",
    "photo-1515886657613-9f3515b0c78f",
    "photo-1591369822096-ffd140ec948f",
    "photo-1434389677669-e08b4cac3105",
    "photo-1600269452121-4f2416e55c28",
    "photo-1553062407-98eeb64c6a62",
    "photo-1551028719-00167b16eac5",
    "photo-1591047139829-d91aecb6caea",
    "photo-1594633312681-425c7b97ccd1",
    "photo-1503342217505-b0a15ec3261c",
    "photo-1582142306909-195724d33ffc",
    "photo-1539533018447-63fcce2678e3",
    "photo-1496747611176-843222e1e57c",
]

PRODUCTS = [
    ("Campera de cuero oversized", "Camperas", "Wrangler", "L", "Negro", "excelente", 28000, 78990, ["Vintage", "Grunge", "Streetwear"], True, "Cuero suave con desgaste natural. Forro interior impecable y cierre metálico original."),
    ("Jean mom Levi's 501", "Denim", "Levi's", "38", "Azul claro", "muy_bueno", 18000, 54990, ["Denim", "Vintage"], True, "Tiro alto, calce mom y botamanga original. Desgaste natural en rodillas."),
    ("Band Tee Nirvana", "Remeras", "Fruit of the Loom", "M", "Negro", "bueno", 6500, 24990, ["Band Tee", "Grunge", "Vintage"], False, "Estampa de los 90s con desgaste vintage. Algodón pesado y calce relajado."),
    ("Vestido floral noventas", "Vestidos", "No brand", "S", "Multicolor", "excelente", 9000, 32990, ["Vintage", "Boho", "Cottagecore"], True, "Estampado floral sobre fondo negro, manga corta y cintura marcada."),
    ("Tapado de paño camel", "Abrigos", "Zara", "M", "Camel", "excelente", 22000, 68990, ["Minimal", "Preppy"], False, "Paño de lana mezcla, largo midi y botonera frontal. Sin marcas de uso."),
    ("Campera denim con bordado", "Denim", "Lee", "M", "Celeste", "muy_bueno", 15000, 45990, ["Denim", "Vintage"], False, "Bordado floral artesanal en espalda. Denim rígido de los 80s."),
    ("Remera Y2K baby tee", "Remeras", "Y2K Studio", "S", "Rosa", "nuevo", 5000, 19990, ["Y2K", "Streetwear"], False, "Baby tee con estampa gráfica y ribete contrastante. Sin uso."),
    ("Pantalón cargo parachute", "Pantalones", "Dickies", "42", "Beige", "muy_bueno", 16000, 48990, ["Y2K", "Streetwear"], False, "Cargo amplio con cordones y bolsillos laterales. Calce parachute."),
    ("Sweater de lana bordado", "Sweaters", "Lacoste", "L", "Crema", "excelente", 12000, 39990, ["Preppy", "Vintage"], False, "Lana merino con bordado vegetal en el pecho. Puños y cuello impecables."),
    ("Falda plisada escocesa", "Faldas", "Burberry", "M", "Rojo", "excelente", 25000, 74990, ["Preppy", "Vintage"], True, "Tartán clásico, plisado permanente y forro interno. Pieza de colección."),
    ("Buzo hoodie grunge", "Sweaters", "Champion", "XL", "Gris", "bueno", 9500, 29990, ["Grunge", "Streetwear"], False, "Felpa pesada con capucha y bolsillo canguro. Desgaste controlado en puños."),
    ("Botas Dr. Martens 1460", "Calzado", "Dr. Martens", "39", "Negro", "muy_bueno", 32000, 89990, ["Grunge", "Streetwear"], True, "Cuero smooth, suela Goodyear y costuras amarillas. Ya amoldadas."),
    ("Cartera de cuero noventas", "Accesorios", "Guess", "Único", "Marrón", "excelente", 11000, 34990, ["Vintage", "Y2K"], False, "Cuero genuino con herrajes dorados. Interior limpio y cierre funcional."),
    ("Camisa oversize de jean", "Denim", "Levi's", "L", "Azul", "bueno", 8500, 27990, ["Denim", "Vintage"], False, "Camisa de denim rígido con bolsillos frontales. Calce oversize."),
    ("Top de punto Y2K", "Remeras", "Mango", "S", "Negro", "nuevo", 4000, 15990, ["Y2K", "Minimal"], False, "Top tejido con escote cuadrado. Sin uso, etiqueta original."),
    ("Vestido slip satinado", "Vestidos", "Zara", "M", "Vino", "excelente", 10000, 35990, ["Minimal", "Y2K"], False, "Satén fluido con tiras ajustables y largo midi. Caída impecable."),
    ("Abrigo de lana vintage", "Abrigos", "Burberry", "L", "Gris", "bueno", 38000, 98990, ["Vintage", "Preppy"], True, "Lana virgen con solapa ancha. Presenta desgaste leve en el ruedo."),
    ("Zapatillas Converse 70s", "Calzado", "Converse", "40", "Blanco", "bueno", 14000, 42990, ["Streetwear", "Vintage"], False, "Chuck Taylor vintage con suela de goma envejecida. Limpias a nuevo."),
    ("Cinturón de cuero", "Accesorios", "No brand", "90", "Negro", "muy_bueno", 3000, 12990, ["Vintage", "Grunge"], False, "Cuero grueso con hebilla metálica. Ajuste regulable."),
    ("Campera bomber Y2K", "Camperas", "Adidas", "M", "Azul", "excelente", 20000, 59990, ["Y2K", "Streetwear"], False, "Nylon brillante con rallas laterales. Forro interior original."),
    ("Blazer oversize de lana", "Camperas", "Vitale Barberis", "L", "Negro", "excelente", 24000, 71990, ["Preppy", "Minimal"], True, "Sastrería italiana, hombros estructurados y forro de seda. Impecable."),
    ("Pantalón de pinzas vintage", "Pantalones", "Pierre Cardin", "40", "Marrón", "muy_bueno", 13000, 41990, ["Vintage", "Preppy"], False, "Tiro alto, pinzas frontales y pierna recta. Lana fría liviana."),
    ("Remera tie dye artesanal", "Remeras", "No brand", "M", "Multicolor", "nuevo", 4500, 17990, ["Boho", "Y2K"], False, "Tie dye hecho a mano, algodón orgánico. Pieza única e irrepetible."),
    ("Falda denim mini", "Faldas", "Levi's", "S", "Celeste", "excelente", 11000, 36990, ["Denim", "Y2K"], False, "Mini de denim con tiro alto y bolsillos. Largo original de los 90s."),
    ("Trench clásico", "Abrigos", "Burberry", "M", "Beige", "muy_bueno", 45000, 129990, ["Vintage", "Preppy"], True, "Gabardina de algodón con cinturón y doble botonadura. Un ícono."),
    ("Top corset satinado", "Remeras", "Zara", "S", "Negro", "nuevo", 6000, 21990, ["Y2K", "Grunge"], False, "Corset estructurado en satén con cierre trasero. Sin uso."),
]

SALES = [
    # (días atrás, índices de prendas, medio de pago, descuento, cliente)
    (40, [2, 7], "transfer", 0, 0),
    (25, [6, 12, 17], "mercadopago", 2000, 0),
    (12, [1, 13], "cash", 0, 1),
    (6, [3, 8], "card", 1500, 0),
    (2, [0, 11], "transfer", 0, 1),
    (0, [9], "mercadopago", 0, 0),
]


def _money(value: float | Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def seed_database() -> bool:
    create_tables()
    db = SessionLocal()
    try:
        existing = db.scalar(select(func.count(User.id))) or 0
        if existing:
            return False

        now = utcnow()

        # ── Usuarios ──────────────────────────────────────────────────
        admin = User(
            name="Guadalupe Arroyo",
            email="admin@caosvintage.com",
            phone="+54 9 11 5555 0101",
            password_hash=hash_password(ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
        )
        co_admin = User(
            name="Lourdes Amado",
            email="lourdes@caosvintage.com",
            phone="+54 9 11 5555 0102",
            password_hash=hash_password(ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
        )
        client = User(
            name="Sofía Cliente",
            email="cliente@caosvintage.com",
            phone="+54 9 11 5555 0201",
            password_hash=hash_password(CLIENT_PASSWORD),
            role=UserRole.CLIENT,
            is_active=True,
        )
        client_two = User(
            name="Camila Rossi",
            email="camila@caosvintage.com",
            phone="+54 9 11 5555 0202",
            password_hash=hash_password(CLIENT_PASSWORD),
            role=UserRole.CLIENT,
            is_active=True,
        )
        db.add_all([admin, co_admin, client, client_two])
        db.flush()

        # ── Categorías y estilos ─────────────────────────────────────
        categories: dict[str, Category] = {}
        for name, description in CATEGORIES:
            slug = name.lower().replace(" ", "-")
            category = Category(name=name, slug=slug, description=description)
            categories[name] = category
            db.add(category)

        styles: dict[str, Style] = {}
        for name, description in STYLES:
            slug = name.lower().replace(" ", "-")
            style = Style(name=name, slug=slug, description=description)
            styles[name] = style
            db.add(style)
        db.flush()

        # ── Catálogo ──────────────────────────────────────────────────
        products: list[Product] = []
        for index, item in enumerate(PRODUCTS):
            (
                name,
                category_name,
                brand,
                size,
                color,
                condition,
                cost,
                price,
                style_names,
                featured,
                description,
            ) = item
            category = categories[category_name]
            prefix = "".join(char for char in category_name.upper() if char.isalpha())[:3]
            product = Product(
                sku=f"CV-{prefix}-{index + 1:03d}",
                name=name,
                description=description,
                category_id=category.id,
                brand=brand,
                size=size,
                color=color,
                condition=ProductCondition(condition),
                status=ProductStatus.AVAILABLE,
                purchase_cost=_money(cost),
                price=_money(price),
                image_url=f"{IMAGE_BASE}{IMAGES[index % len(IMAGES)]}{IMAGE_QUERY}",
                is_featured=featured,
                is_active=True,
                created_at=now - timedelta(days=65 - index),
                updated_at=now - timedelta(days=65 - index),
            )
            product.styles = [styles[style_name] for style_name in style_names]
            db.add(product)
            products.append(product)
        db.flush()

        for index, product in enumerate(products):
            db.add(
                InventoryMovement(
                    product_id=product.id,
                    movement_type=MovementType.ENTRY,
                    quantity=1,
                    reference="ALTA-SEED",
                    notes="Ingreso inicial del catálogo demo.",
                    created_by_id=admin.id,
                    created_at=now - timedelta(days=65 - index),
                )
            )

        # ── Ventas de ejemplo ────────────────────────────────────────
        sold_indexes: set[int] = set()
        for sale_number, (days_ago, product_indexes, payment, discount, customer_index) in enumerate(
            SALES, start=1
        ):
            sale_date = now - timedelta(days=days_ago, hours=sale_number)
            selected = [products[index] for index in product_indexes]
            for index in product_indexes:
                if index in sold_indexes:
                    raise RuntimeError(f"Producto duplicado en ventas seed: {index}")
                sold_indexes.add(index)
            customer = client if customer_index == 0 else client_two
            subtotal = _money(sum((product.price for product in selected), Decimal("0")))
            discount_amount = _money(discount)
            total = _money(subtotal - discount_amount)
            ratio = discount_amount / subtotal if subtotal else Decimal("0")
            sale = Sale(
                code=f"CV-SEED-{sale_number:04d}",
                user_id=customer.id,
                sold_by_id=admin.id,
                customer_name=customer.name,
                customer_email=customer.email,
                subtotal=subtotal,
                discount=discount_amount,
                total=total,
                payment_method=PaymentMethod(payment),
                status=SaleStatus.COMPLETED,
                notes="Venta demo generada por la carga inicial.",
                created_at=sale_date,
                updated_at=sale_date,
            )
            db.add(sale)
            db.flush()

            for product in selected:
                line_discount = _money(product.price * ratio)
                line_total = _money(product.price - line_discount)
                line_profit = _money(line_total - product.purchase_cost)
                db.add(
                    SaleItem(
                        sale_id=sale.id,
                        product_id=product.id,
                        product_name=product.name,
                        quantity=1,
                        unit_price=product.price,
                        unit_cost=product.purchase_cost,
                        line_total=line_total,
                        line_profit=line_profit,
                    )
                )
                product.status = ProductStatus.SOLD
                db.add(
                    InventoryMovement(
                        product_id=product.id,
                        movement_type=MovementType.SALE,
                        quantity=1,
                        reference=sale.code,
                        notes="Salida por venta demo.",
                        created_by_id=admin.id,
                        created_at=sale_date,
                    )
                )

        # ── Venta cancelada (reingreso de stock) ─────────────────────
        cancelled_product = products[19]
        cancelled_date = now - timedelta(days=9, hours=3)
        cancelled_sale = Sale(
            code="CV-SEED-9001",
            user_id=client.id,
            sold_by_id=co_admin.id,
            customer_name=client.name,
            customer_email=client.email,
            subtotal=cancelled_product.price,
            discount=_money(0),
            total=cancelled_product.price,
            payment_method=PaymentMethod.transfer if False else PaymentMethod.TRANSFER,
            status=SaleStatus.CANCELLED,
            notes="Cancelación demo: la clienta eligió otra prenda.\nVenta cancelada por administración.",
            created_at=cancelled_date,
            updated_at=cancelled_date,
        )
        db.add(cancelled_sale)
        db.flush()
        db.add(
            SaleItem(
                sale_id=cancelled_sale.id,
                product_id=cancelled_product.id,
                product_name=cancelled_product.name,
                quantity=1,
                unit_price=cancelled_product.price,
                unit_cost=cancelled_product.purchase_cost,
                line_total=cancelled_product.price,
                line_profit=_money(cancelled_product.price - cancelled_product.purchase_cost),
            )
        )
        db.add_all(
            [
                InventoryMovement(
                    product_id=cancelled_product.id,
                    movement_type=MovementType.SALE,
                    quantity=1,
                    reference=cancelled_sale.code,
                    notes="Salida demo posteriormente cancelada.",
                    created_by_id=co_admin.id,
                    created_at=cancelled_date,
                ),
                InventoryMovement(
                    product_id=cancelled_product.id,
                    movement_type=MovementType.RETURN,
                    quantity=1,
                    reference=cancelled_sale.code,
                    notes="Reingreso por cancelación demo.",
                    created_by_id=co_admin.id,
                    created_at=cancelled_date + timedelta(hours=2),
                ),
            ]
        )

        # ── Historial de sugerencias IA ───────────────────────────────
        db.add(
            PriceSuggestion(
                user_id=admin.id,
                product_id=None,
                strategy="balanceado",
                category_name="Camperas",
                condition=ProductCondition.EXCELENTE,
                brand="Wrangler",
                purchase_cost=_money(28000),
                suggested_price=_money(78990),
                min_price=_money(64990),
                max_price=_money(89990),
                estimated_profit=_money(50990),
                margin_percent=_money(64.55),
                confidence=_money(88),
                rationale=json.dumps(
                    [
                        "Categoría Camperas: multiplicador base 2.80x.",
                        "Estado excelente: +12% sobre el precio base.",
                        "Marca Wrangler: +18% por demanda de marca.",
                        "Estilos Vintage, Grunge, Streetwear: +14% por tendencia.",
                        "Precio redondeado a terminación 990 para percepción de valor.",
                    ],
                    ensure_ascii=False,
                ),
                created_at=now - timedelta(days=3),
            )
        )

        db.commit()
        return True
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    created = seed_database()
    print("Datos iniciales cargados." if created else "La base ya contenía datos; no se modificó.")
