"""Pruebas del flujo de venta: checkout, stock unitario, cancelación y permisos."""
from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import unique


def _checkout(client: TestClient, headers: dict[str, str], product_ids: list[int], **extra) -> dict:
    payload = {"items": [{"product_id": pid} for pid in product_ids], "payment_method": "transfer"}
    payload.update(extra)
    response = client.post("/api/sales", json=payload, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_checkout_marks_stock_as_sold(
    client: TestClient, client_headers: dict[str, str], admin_headers: dict[str, str], make_product
) -> None:
    product = make_product(price=3000, purchase_cost=1200)
    sale = _checkout(client, client_headers, [product["id"]], notes="Prueba de checkout")
    assert sale["status"] == "completed"
    assert sale["total"] == 3000
    assert sale["total_items"] == 1
    assert sale["items"][0]["product_id"] == product["id"]

    sold = client.get(f"/api/products/{product['id']}")
    assert sold.status_code == 200
    assert sold.json()["status"] == "sold"
    assert sold.json()["available"] is False

    # El stock es unitario: no puede venderse dos veces.
    again = client.post(
        "/api/sales",
        json={"items": [{"product_id": product["id"]}]},
        headers=client_headers,
    )
    assert again.status_code == 409

    mine = client.get("/api/sales/mine", headers=client_headers).json()
    assert any(item["id"] == sale["id"] for item in mine["items"])

    # El detalle administrativo expone costo y rentabilidad; el público no.
    admin_sale = client.get(f"/api/admin/sales/{sale['id']}", headers=admin_headers)
    assert admin_sale.status_code == 200
    detail = admin_sale.json()
    assert detail["total_profit"] == 1800
    assert detail["margin_percent"] > 0
    assert detail["items"][0]["unit_cost"] == 1200


def test_cancel_sale_returns_stock_and_is_idempotent_guard(
    client: TestClient, client_headers: dict[str, str], admin_headers: dict[str, str], make_product
) -> None:
    product = make_product(price=5000, purchase_cost=2000)
    sale = _checkout(client, client_headers, [product["id"]])

    forbidden = client.post(f"/api/admin/sales/{sale['id']}/cancel", json={}, headers=client_headers)
    assert forbidden.status_code == 403

    cancelled = client.post(
        f"/api/admin/sales/{sale['id']}/cancel",
        json={"reason": "Prueba automatizada"},
        headers=admin_headers,
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    restored = client.get(f"/api/products/{product['id']}").json()
    assert restored["status"] == "available"
    assert restored["available"] is True

    second = client.post(f"/api/admin/sales/{sale['id']}/cancel", json={}, headers=admin_headers)
    assert second.status_code == 400


def test_checkout_validations(client: TestClient, client_headers: dict[str, str], make_product) -> None:
    product = make_product()
    duplicate = client.post(
        "/api/sales",
        json={"items": [{"product_id": product["id"]}, {"product_id": product["id"]}]},
        headers=client_headers,
    )
    assert duplicate.status_code == 422

    missing = client.post(
        "/api/sales", json={"items": [{"product_id": 999_999}]}, headers=client_headers
    )
    assert missing.status_code == 404

    discount = client.post(
        "/api/sales",
        json={"items": [{"product_id": product["id"]}], "discount": 999_999},
        headers=client_headers,
    )
    assert discount.status_code == 422


def test_checkout_requires_authentication(client: TestClient, make_product) -> None:
    product = make_product()
    response = client.post("/api/sales", json={"items": [{"product_id": product["id"]}]})
    assert response.status_code == 401


def test_sale_visibility_between_clients(client: TestClient, client_headers: dict[str, str], make_product) -> None:
    product = make_product()
    sale = _checkout(client, client_headers, [product["id"]])

    other_email = f"{unique('otro')}@example.com"
    registered = client.post(
        "/api/auth/register",
        json={"name": "Otro Cliente", "email": other_email, "password": "OtraClave123"},
    )
    other_headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}

    forbidden = client.get(f"/api/sales/{sale['id']}", headers=other_headers)
    assert forbidden.status_code == 403

    # Los clientes tampoco acceden al listado administrativo.
    assert client.get("/api/admin/sales", headers=other_headers).status_code == 403


def test_admin_sales_filters(client: TestClient, admin_headers: dict[str, str]) -> None:
    listing = client.get(
        "/api/admin/sales", params={"status": "completed", "page_size": 5}, headers=admin_headers
    )
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] >= 1
    assert all(item["status"] == "completed" for item in body["items"])
    assert "total_profit" in body["items"][0]
