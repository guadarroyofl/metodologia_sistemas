"""Reglas de negocio del catálogo y control de stock unitario."""
from __future__ import annotations

import re
import secrets
import unicodedata
from decimal import Decimal

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.catalog import Category, Product, Style
from app.models.enums import MovementType, ProductStatus, UserRole
from app.models.inventory import InventoryMovement
from app.models.user import User
from app.repositories.catalog_repository import CatalogRepository
from app.schemas.catalog import (
    CategoryIn,
    CategoryUpdate,
    ProductIn,
    ProductUpdate,
    StyleIn,
    StyleUpdate,
)
from app.services.base_service import BaseService


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def _decimal(value: float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


class CatalogService(BaseService):
    def __init__(self, db) -> None:  # noqa: ANN001
        super().__init__(db)
        self.catalog = CatalogRepository(db)

    # ── Categorías ────────────────────────────────────────────────────
    def list_categories(self) -> list[Category]:
        return self.catalog.list_categories()

    def create_category(self, payload: CategoryIn) -> Category:
        name = " ".join(payload.name.split())
        if self.catalog.get_category_by_name(name):
            raise ConflictError("Ya existe una categoría con ese nombre.")
        base_slug = slugify(name)
        slug = base_slug
        suffix = 1
        while self.catalog.get_category_by_slug(slug):
            suffix += 1
            slug = f"{base_slug}-{suffix}"
        category = Category(name=name, slug=slug, description=payload.description)
        self.db.add(category)
        self.commit("No se pudo crear la categoría.")
        self.db.refresh(category)
        return category

    def update_category(self, category_id: int, payload: CategoryUpdate) -> Category:
        category = self.catalog.get_category(category_id)
        if category is None:
            raise NotFoundError("Categoría no encontrada.")
        data = payload.model_dump(exclude_unset=True)
        if "name" in data and data["name"]:
            name = " ".join(data["name"].split())
            existing = self.catalog.get_category_by_name(name)
            if existing and existing.id != category.id:
                raise ConflictError("Ya existe una categoría con ese nombre.")
            data["name"] = name
            data["slug"] = slugify(name)
        for field, value in data.items():
            setattr(category, field, value)
        self.commit("No se pudo actualizar la categoría.")
        self.db.refresh(category)
        return category

    def delete_category(self, category_id: int) -> None:
        category = self.catalog.get_category(category_id)
        if category is None:
            raise NotFoundError("Categoría no encontrada.")
        if self.catalog.category_has_products(category.id):
            raise ConflictError(
                "No se puede eliminar una categoría con prendas asociadas. "
                "Reasigná o eliminá primero esas prendas."
            )
        self.db.delete(category)
        self.commit("No se pudo eliminar la categoría.")

    # ── Estilos ───────────────────────────────────────────────────────
    def list_styles(self) -> list[Style]:
        return self.catalog.list_styles()

    def create_style(self, payload: StyleIn) -> Style:
        name = " ".join(payload.name.split())
        if self.catalog.get_style_by_name(name):
            raise ConflictError("Ya existe un estilo con ese nombre.")
        base_slug = slugify(name)
        slug = base_slug
        suffix = 1
        while self.catalog.get_style_by_slug(slug):
            suffix += 1
            slug = f"{base_slug}-{suffix}"
        style = Style(name=name, slug=slug, description=payload.description)
        self.db.add(style)
        self.commit("No se pudo crear el estilo.")
        self.db.refresh(style)
        return style

    def update_style(self, style_id: int, payload: StyleUpdate) -> Style:
        style = self.catalog.get_style(style_id)
        if style is None:
            raise NotFoundError("Estilo no encontrado.")
        data = payload.model_dump(exclude_unset=True)
        if "name" in data and data["name"]:
            name = " ".join(data["name"].split())
            existing = self.catalog.get_style_by_name(name)
            if existing and existing.id != style.id:
                raise ConflictError("Ya existe un estilo con ese nombre.")
            data["name"] = name
            data["slug"] = slugify(name)
        for field, value in data.items():
            setattr(style, field, value)
        self.commit("No se pudo actualizar el estilo.")
        self.db.refresh(style)
        return style

    def delete_style(self, style_id: int) -> None:
        style = self.catalog.get_style(style_id)
        if style is None:
            raise NotFoundError("Estilo no encontrado.")
        if self.catalog.count_style_usage(style.id):
            raise ConflictError(
                "El estilo está asignado a prendas. Quitá la etiqueta de esas prendas antes de eliminarlo."
            )
        self.db.delete(style)
        self.commit("No se pudo eliminar el estilo.")

    # ── Prendas ───────────────────────────────────────────────────────
    def _generate_sku(self, category: Category) -> str:
        letters = re.sub(r"[^A-Z]", "", slugify(category.name).upper())[:3].ljust(3, "X")
        for _ in range(25):
            sku = f"CV-{letters}-{secrets.token_hex(3).upper()}"
            if not self.catalog.sku_exists(sku):
                return sku
        raise ConflictError("No se pudo generar un SKU único. Intentá nuevamente.")

    def _resolve_styles(self, style_ids: list[int]) -> list[Style]:
        styles = self.catalog.get_styles_by_ids(style_ids)
        if len(styles) != len(set(style_ids)):
            raise ValidationError("Uno o más estilos seleccionados no existen.", code="invalid_styles")
        return styles

    def create_product(self, payload: ProductIn, actor: User) -> Product:
        category = self.catalog.get_category(payload.category_id)
        if category is None:
            raise NotFoundError("La categoría seleccionada no existe.")
        styles = self._resolve_styles(payload.style_ids)

        product = Product(
            sku=self._generate_sku(category),
            name=payload.name,
            description=payload.description.strip(),
            category_id=category.id,
            brand=payload.brand.strip() if payload.brand else None,
            size=payload.size,
            color=payload.color,
            condition=payload.condition,
            status=payload.status,
            purchase_cost=_decimal(payload.purchase_cost),
            price=_decimal(payload.price),
            image_url=payload.image_url,
            is_featured=payload.is_featured,
            is_active=payload.status != ProductStatus.ARCHIVED,
        )
        product.styles = styles
        self.db.add(product)
        self.db.flush()
        self.db.add(
            InventoryMovement(
                product_id=product.id,
                movement_type=MovementType.ENTRY,
                quantity=1,
                reference="ALTA",
                notes="Ingreso inicial de prenda única al catálogo.",
                created_by_id=actor.id,
            )
        )
        self.commit("No se pudo crear la prenda. Verificá los datos.")
        return self.catalog.get_product(product.id)  # type: ignore[return-value]

    def update_product(self, product_id: int, payload: ProductUpdate, actor: User) -> Product:
        product = self.catalog.get_product(product_id)
        if product is None:
            raise NotFoundError("Prenda no encontrada.")
        data = payload.model_dump(exclude_unset=True)
        style_ids = data.pop("style_ids", None)

        if "category_id" in data and data["category_id"] is not None:
            if self.catalog.get_category(data["category_id"]) is None:
                raise NotFoundError("La categoría seleccionada no existe.")

        new_price = _decimal(data["price"]) if "price" in data and data["price"] is not None else product.price
        new_cost = (
            _decimal(data["purchase_cost"])
            if "purchase_cost" in data and data["purchase_cost"] is not None
            else product.purchase_cost
        )
        if new_price <= new_cost:
            raise ValidationError("El precio de venta debe ser mayor al costo de compra.")

        if "status" in data and data["status"] is not None:
            data["status"] = ProductStatus(data["status"])
        if data.get("is_active") is False:
            data["status"] = ProductStatus.ARCHIVED
        elif data.get("is_active") is True and product.status == ProductStatus.ARCHIVED:
            data["status"] = ProductStatus.AVAILABLE

        previous_status = product.status
        for field, value in data.items():
            if field in {"price", "purchase_cost"} and value is not None:
                value = _decimal(value)
            setattr(product, field, value)

        if style_ids is not None:
            product.styles = self._resolve_styles(style_ids)

        if product.status != previous_status:
            self.db.add(
                InventoryMovement(
                    product_id=product.id,
                    movement_type=MovementType.ADJUSTMENT,
                    quantity=1,
                    reference="AJUSTE",
                    notes=(
                        f"Cambio de estado: {previous_status.value} → {product.status.value}."
                    ),
                    created_by_id=actor.id,
                )
            )

        self.commit("No se pudo actualizar la prenda.")
        return self.catalog.get_product(product.id)  # type: ignore[return-value]

    def deactivate_product(self, product_id: int, actor: User) -> Product:
        product = self.catalog.get_product(product_id)
        if product is None:
            raise NotFoundError("Prenda no encontrada.")
        if not product.is_active:
            return product
        product.is_active = False
        product.status = ProductStatus.ARCHIVED
        self.db.add(
            InventoryMovement(
                product_id=product.id,
                movement_type=MovementType.ADJUSTMENT,
                quantity=1,
                reference="BAJA",
                notes="Baja lógica del catálogo (se preserva el historial de ventas).",
                created_by_id=actor.id,
            )
        )
        self.commit("No se pudo dar de baja la prenda.")
        return product

    def get_product(self, product_id: int) -> Product:
        product = self.catalog.get_product(product_id)
        if product is None:
            raise NotFoundError("Prenda no encontrada.")
        return product

    def list_products(self, **filters) -> tuple[list[Product], int]:
        page = max(1, int(filters.pop("page", 1)))
        page_size = min(100, max(1, int(filters.pop("page_size", 12))))
        public_only = bool(filters.pop("public_only", True))
        include_inactive = bool(filters.pop("include_inactive", False))
        products, total = self.catalog.list_products(
            page=page,
            page_size=page_size,
            public_only=public_only,
            include_inactive=include_inactive,
            **filters,
        )
        return products, total

    def list_available_for_ai(self) -> list[Product]:
        return self.catalog.list_available_for_ai()
