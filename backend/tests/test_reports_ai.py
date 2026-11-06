"""Pruebas de dashboard, reportes, exportaciones y módulos de IA."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_dashboard_metrics(client: TestClient, admin_headers: dict[str, str], client_headers: dict[str, str]) -> None:
    assert client.get("/api/dashboard", headers=client_headers).status_code == 403

    response = client.get("/api/dashboard", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    for key in ("today", "month", "lifetime", "stock", "counts", "recent_sales", "monthly_series", "alerts"):
        assert key in body
    assert body["counts"]["products"] > 0
    assert body["counts"]["clients"] >= 1
    assert body["stock"]["available"] >= 1


def test_reports_require_admin(client: TestClient, client_headers: dict[str, str], admin_headers: dict[str, str]) -> None:
    for path in ("/api/reports/summary", "/api/reports/profitability", "/api/reports/stock"):
        assert client.get(path, headers=client_headers).status_code == 403
        response = client.get(path, headers=admin_headers)
        assert response.status_code == 200, path


def test_sales_summary_shape(client: TestClient, admin_headers: dict[str, str]) -> None:
    body = client.get("/api/reports/summary", headers=admin_headers).json()
    for key in ("range", "totals", "daily", "by_category", "by_brand", "by_payment", "top_products", "stock"):
        assert key in body
    assert "revenue" in body["totals"]
    assert "profit" in body["totals"]
    assert body["stock"]["available"] >= 1
    assert "inventory_cost" in body["stock"]


def test_profitability_shape(client: TestClient, admin_headers: dict[str, str]) -> None:
    body = client.get("/api/reports/profitability", headers=admin_headers).json()
    assert "totals" in body
    assert isinstance(body["by_category"], list)
    assert isinstance(body["by_brand"], list)
    assert isinstance(body["daily"], list)


def test_stock_report_shape(client: TestClient, admin_headers: dict[str, str]) -> None:
    body = client.get("/api/reports/stock", headers=admin_headers).json()
    assert body["totals"]["available"] == len(
        [product for product in body["products"] if product["status"] == "available"]
    )
    assert isinstance(body["by_category"], list)
    if body["products"]:
        assert "cost" in body["products"][0]
        assert "status" in body["products"][0]


def test_exports_all_formats(client: TestClient, admin_headers: dict[str, str], client_headers: dict[str, str]) -> None:
    assert client.get("/api/reports/export", headers=client_headers).status_code == 403

    expectations = {
        "csv": ("text/csv", b"\xef\xbb\xbf"),
        "xlsx": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", b"PK"),
        "pdf": ("application/pdf", b"%PDF"),
    }
    for fmt, (media_type, prefix) in expectations.items():
        response = client.get(
            "/api/reports/export",
            params={"report": "ventas", "format": fmt},
            headers=admin_headers,
        )
        assert response.status_code == 200, response.text
        assert response.headers["content-type"].startswith(media_type)
        assert "attachment" in response.headers["content-disposition"]
        assert response.content.startswith(prefix)

    for report in ("stock", "rentabilidad"):
        response = client.get(
            "/api/reports/export",
            params={"report": report, "format": "csv"},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert len(response.content) > 0


def test_stylist_recommendations(client: TestClient) -> None:
    response = client.post(
        "/api/ai/stylist",
        json={
            "message": "Busco un look Y2K con denim para una salida de noche",
            "budget_max": 80000,
            "limit": 3,
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["reply"]
    assert len(body["suggestions"]) <= 3
    assert body["tips"]
    for suggestion in body["suggestions"]:
        assert suggestion["score"] > 0
        assert suggestion["reason"]
        assert suggestion["product"]["available"] is True
    assert "detected_styles" in body


def test_stylist_validates_empty_message(client: TestClient) -> None:
    response = client.post("/api/ai/stylist", json={"message": ""})
    assert response.status_code == 422


def test_pricing_engine_and_history(
    client: TestClient, admin_headers: dict[str, str], client_headers: dict[str, str], categories: list[dict]
) -> None:
    payload = {
        "purchase_cost": 12000,
        "category_id": categories[0]["id"],
        "condition": "excelente",
        "brand": "Levi's",
        "strategy": "balanceado",
    }
    assert client.post("/api/ai/pricing", json=payload, headers=client_headers).status_code == 403

    response = client.post("/api/ai/pricing", json=payload, headers=admin_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["suggested_price"] > 12000
    assert body["min_price"] <= body["suggested_price"] <= body["max_price"]
    assert body["estimated_profit"] > 0
    assert body["margin_percent"] > 0
    assert body["rationale"]
    assert body["disclaimer"]
    assert body["suggestion_id"]

    history = client.get("/api/ai/pricing/history", headers=admin_headers)
    assert history.status_code == 200
    assert any(item["id"] == body["suggestion_id"] for item in history.json())

    strategies = set()
    for strategy in ("conservador", "balanceado", "agresivo"):
        result = client.post(
            "/api/ai/pricing", json={**payload, "strategy": strategy}, headers=admin_headers
        )
        assert result.status_code == 200
        strategies.add(result.json()["suggested_price"])
    assert len(strategies) == 3, "Cada estrategia debe producir un precio distinto."
