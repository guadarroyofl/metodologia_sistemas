"""Checkout, consulta y cancelación de ventas con control de stock unitario."""
from __future__ import annotations

import secrets
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import update

from app.core.exceptions import BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.core.security import utcnow
from app.models.catalog import Product
from app.models.enums import MovementType, ProductStatus, SaleStatus, UserRole
from app.models.inventory import InventoryMovement
from app.models.sale import Sale, SaleItem
from app.models.user import User
from app.repositories.catalog_repository import CatalogRepository
from app.repositories.sale_repository import SaleRepository
from app.schemas.sale import SaleCreate
from app.services.base_service import BaseService

MONEY = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


class SaleService(BaseService):
    def __init__(self, db) -> None:  # noqa: ANN001
        super().__init__(db)
        self.sales = SaleRepository(db)
        self.catalog = CatalogRepository(db)

    def _generate_code(self) -> str:
        stamp = utcnow().strftime("%Y%m%d")
        for _ in range(30):
            code = f"CV-{stamp}-{secrets.token_hex(2).upper()}"
            if not self.sales.code_exists(code):
                return code
        raise ConflictError("No se pudo generar un código de venta único.")

    def checkout(self, actor: User, payload: SaleCreate) -> Sale:
        product_ids = [item.product_id for item in payload.items]
        products = self.catalog.get_products_by_ids(product_ids)
        product_map = {product.id: product for product in products}

        missing = [product_id for product_id in product_ids if product_id not in product_map]
        if missing:
            raise NotFoundError(f"No se encontraron las prendas con ID: {missing}.")

        unavailable = [
            product.name for product in products if not product.available
        ]
        if unavailable:
            raise ConflictError(
                "Estas prendas ya no están disponibles (stock unitario): "
                + ", ".join(unavailable)
            )

        subtotal = _money(sum((Decimal(product.price) for product in products), Decimal("0")))
        discount = _money(Decimal(str(payload.discount)))
        if discount >= subtotal:
            raise ValidationError("El descuento debe ser menor al subtotal de la venta.")
        total = _money(subtotal - discount)

        # Distribución proporcional del descuento para que la rentabilidad sea real.
        discount_ratio = (discount / subtotal) if subtotal else Decimal("0")

        sale = Sale(
            code=self._generate_code(),
            user_id=actor.id,
            sold_by_id=actor.id,
            customer_name=payload.customer_name or actor.name,
            customer_email=str(payload.customer_email or actor.email),
            subtotal=subtotal,
            discount=discount,
            total=total,
            payment_method=payload.payment_method,
            status=SaleStatus.COMPLETED,
            notes=payload.notes,
        )
        self.db.add(sale)
        self.db.flush()

        try:
            for product in products:
                line_discount = _money(Decimal(product.price) * discount_ratio)
                line_total = _money(Decimal(product.price) - line_discount)
                line_profit = _money(line_total - Decimal(product.purchase_cost))
                self.db.add(
                    SaleItem(
                        sale_id=sale.id,
                        product_id=product.id,
                        product_name=product.name,
                        quantity=1,
                        unit_price=Decimal(product.price),
                        unit_cost=Decimal(product.purchase_cost),
                        line_total=line_total,
                        line_profit=line_profit,
                    )
                )
                result = self.db.execute(
                    update(Product)
                    .where(
                        Product.id == product.id,
                        Product.status == ProductStatus.AVAILABLE,
                        Product.is_active.is_(True),
                    )
                    .values(status=ProductStatus.SOLD)
                    .execution_options(synchronize_session=False)
                )
                if result.rowcount != 1:
                    raise ConflictError(
                        f"La prenda {product.name} acaba de ser vendida por otra persona."
                    )
                self.db.add(
                    InventoryMovement(
                        product_id=product.id,
                        movement_type=MovementType.SALE,
                        quantity=1,
                        reference=sale.code,
                        notes="Salida por venta confirmada.",
                        created_by_id=actor.id,
                    )
                )
            self.commit("No se pudo registrar la venta. Intentá nuevamente.")
        except Exception:
            self.rollback()
            raise

        return self.sales.get_full(sale.id)  # type: ignore[return-value]

    def list_my_sales(self, actor: User, page: int, page_size: int) -> tuple[list[Sale], int]:
        return self.sales.list_sales(
            user_id=actor.id,
            page=max(1, page),
            page_size=min(50, max(1, page_size)),
        )

    def list_all_sales(
        self,
        *,
        status: SaleStatus | None = None,
        search: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Sale], int]:
        return self.sales.list_sales(
            status=status,
            search=search,
            date_from=date_from,
            date_to=date_to,
            page=max(1, page),
            page_size=min(100, max(1, page_size)),
        )

    def get_sale_for_actor(self, sale_id: int, actor: User) -> Sale:
        sale = self.sales.get_full(sale_id)
        if sale is None:
            raise NotFoundError("Venta no encontrada.")
        if actor.role != UserRole.ADMIN and sale.user_id != actor.id:
            raise ForbiddenError("No tenés permiso para ver esta venta.")
        return sale

    def cancel_sale(self, sale_id: int, actor: User, reason: str | None = None) -> Sale:
        sale = self.sales.get_full(sale_id)
        if sale is None:
            raise NotFoundError("Venta no encontrada.")
        if sale.status == SaleStatus.CANCELLED:
            raise BusinessRuleError("La venta ya está cancelada.")
        if actor.role != UserRole.ADMIN:
            raise ForbiddenError("Sólo un administrador puede cancelar ventas.")

        for item in sale.items:
            product = self.db.get(Product, item.product_id)
            if product is not None and product.is_active:
                product.status = ProductStatus.AVAILABLE
                self.db.add(
                    InventoryMovement(
                        product_id=product.id,
                        movement_type=MovementType.RETURN,
                        quantity=1,
                        reference=sale.code,
                        notes=f"Reingreso por cancelación de venta. {reason or ''}".strip(),
                        created_by_id=actor.id,
                    )
                )

        sale.status = SaleStatus.CANCELLED
        note = f"Cancelación: {reason}" if reason else "Venta cancelada por administración."
        sale.notes = f"{sale.notes or ''}\n{note}".strip()
        self.commit("No se pudo cancelar la venta.")
        return self.sales.get_full(sale.id)  # type: ignore[return-value]
