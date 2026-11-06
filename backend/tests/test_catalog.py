"""Pruebas del catálogo público, el ABM de prendas y la integridad del catálogo."""
from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import unique


def test_public_catalog_does_not_leak_costs(client: TestClient) -> None:
    response = client.get("/api/products", params={"page_size": 5})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] > 0
    assert len(body["items"]) <= 5
    for product in body["items"]:
        assert "purchase_cost" not in product
        assert "margin_percent" not in product
        assert product["status"] == "available"
        assert product["available"] is True
        assert product["category"]["name"]


def test_product_filters(client: TestClient) -> None:
    page = client.get("/api/products", params={"page_size": 48}).json()
    sample = page["items"][0]
    by_size = client.get("/api/products", params={"size": sample["size"], "page_size": 48})
    assert by_size.status_code == 200
    assert all(item["size"] == sample["size"] for item in by_size.json()["items"])

    by_price = client.get("/api/products", params={"min_price": 1, "max_price": sample["price"], "page_size": 48})
    assert by_price.status_code == 200
    assert all(item["price"] <= sample["price"] for item in by_price.json()["items"])

    by_category = client.get("/api/products", params={"category_id": sample["category"]["id"]})
    assert by_category.status_code == 200
    assert all(item["category"]["id"] == sample["category"]["id"] for item in by_category.json()["items"])


def test_featured_products(client: TestClient) -> None:
    response = client.get("/api/products/featured", params={"limit": 3})
    assert response.status_code == 200
    items = response.json()
    assert len(items) <= 3
    assert all(item["is_featured"] for item in items)


def test_admin_product_list_requires_role_and_returns_margins(
    client: TestClient, admin_headers: dict[str, str], client_headers: dict[str, str]
) -> None:
    assert client.get("/api/products/admin/all", headers=client_headers).status_code == 403
    response = client.get("/api/products/admin/all", headers=admin_headers)
    assert response.status_code == 200
    first = response.json()["items"][0]
    assert "purchase_cost" in first
    assert first["margin_amount"] >= 0
    assert first["margin_percent"] >= 0


def test_product_crud_and_logical_delete(
    client: TestClient, admin_headers: dict[str, str], make_product
) -> None:
    product = make_product(name=f"Campera Test {unique('crud')}", price=4000, purchase_cost=1500)
    product_id = product["id"]

    public = client.get(f"/api/products/{product_id}")
    assert public.status_code == 200
    assert public.json()["name"] == product["name"]

    updated = client.patch(
        f"/api/products/{product_id}",
        json={"price": 4500, "is_featured": True},
        headers=admin_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["price"] == 4500
    assert updated.json()["is_featured"] is True

    deleted = client.delete(f"/api/products/{product_id}", headers=admin_headers)
    assert deleted.status_code == 200

    assert client.get(f"/api/products/{product_id}").status_code == 404
    admin_list = client.get(
        "/api/products/admin/all", params={"q": product["name"]}, headers=admin_headers
    ).json()
    assert admin_list["total"] == 1
    assert admin_list["items"][0]["is_active"] is False


def test_product_validation_rejects_bad_margin(
    client: TestClient, admin_headers: dict[str, str], categories: list[dict]
) -> None:
    response = client.post(
        "/api/products",
        json={
            "name": "Margen Inválido Test",
            "category_id": categories[0]["id"],
            "purchase_cost": 5000,
            "price": 3000,
        },
        headers=admin_headers,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_product_missing_category_is_not_found(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/products",
        json={
            "name": "Categoría Fantasma",
            "category_id": 999_999,
            "purchase_cost": 1000,
            "price": 2000,
        },
        headers=admin_headers,
    )
    assert response.status_code == 404


def test_client_cannot_create_products(
    client: TestClient, client_headers: dict[str, str], categories: list[dict]
) -> None:
    response = client.post(
        "/api/products",
        json={
            "name": "Intento Cliente",
            "category_id": categories[0]["id"],
            "purchase_cost": 1000,
            "price": 2000,
        },
        headers=client_headers,
    )
    assert response.status_code == 403


def test_category_crud_and_restriction(
    client: TestClient, admin_headers: dict[str, str], categories: list[dict]
) -> None:
    name = f"Categoria {unique('cat')}"
    created = client.post(
        "/api/categories", json={"name": name, "description": "Temporal"}, headers=admin_headers
    )
    assert created.status_code == 201, created.text
    category_id = created.json()["id"]
    assert created.json()["slug"]

    duplicate = client.post("/api/categories", json={"name": name}, headers=admin_headers)
    assert duplicate.status_code == 409

    updated = client.patch(
        f"/api/categories/{category_id}",
        json={"description": "Actualizada"},
        headers=admin_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["description"] == "Actualizada"

    product = client.post(
        "/api/products",
        json={
            "name": f"Producto Categoría {unique('p')}",
            "category_id": category_id,
            "purchase_cost": 100,
            "price": 300,
        },
        headers=admin_headers,
    )
    assert product.status_code == 201

    blocked = client.delete(f"/api/categories/{category_id}", headers=admin_headers)
    assert blocked.status_code == 409

    # Una categoría sin prendas asociadas sí puede eliminarse.
    empty = client.post(
        "/api/categories", json={"name": f"Vacia {unique('cat')}"}, headers=admin_headers
    )
    assert empty.status_code == 201
    assert client.delete(f"/api/categories/{empty.json()['id']}", headers=admin_headers).status_code == 200


def test_style_crud(client: TestClient, admin_headers: dict[str, str], make_product, styles: list[dict]) -> None:
    name = f"Estilo {unique('st')}"
    created = client.post("/api/styles", json={"name": name}, headers=admin_headers)
    assert created.status_code == 201, created.text
    style_id = created.json()["id"]

    product = make_product(style_ids=[style_id, style_id])
    assert [style["id"] for style in product["styles"]] == [style_id]

    blocked = client.delete(f"/api/styles/{style_id}", headers=admin_headers)
    assert blocked.status_code == 409

    # Al quitar la etiqueta de la prenda, el estilo queda libre.
    detached = client.patch(
        f"/api/products/{product['id']}", json={"style_ids": []}, headers=admin_headers
    )
    assert detached.status_code == 200
    assert client.delete(f"/api/styles/{style_id}", headers=admin_headers).status_code == 200


def test_unknown_product_returns_404(client: TestClient) -> None:
    response = client.get("/api/products/999999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
