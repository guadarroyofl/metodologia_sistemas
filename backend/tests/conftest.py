"""Configuración de pytest: base de datos temporal aislada y clientes autenticados."""
from __future__ import annotations

import os
import tempfile
import uuid
from collections.abc import Callable, Generator
from pathlib import Path

import pytest

# Debe definirse ANTES de importar la aplicación: app.core.config lee el entorno
# al importarse y app.db.session crea el engine a partir de esa configuración.
_TEST_DIR = Path(tempfile.mkdtemp(prefix="caos-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_TEST_DIR / 'test.db').as_posix()}"
# Se usa "development" para poder probar el flujo de recuperación sin servicio de email
# (el backend expone el token de reseteo sólo en desarrollo).
os.environ["ENVIRONMENT"] = "development"
os.environ["DEBUG"] = "false"
os.environ["SECRET_KEY"] = "test-secret-key-caos-vintage-0123456789abcdef"
os.environ["SEED_ON_STARTUP"] = "true"
os.environ["FRONTEND_ORIGINS"] = "http://localhost:5173"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

ADMIN_EMAIL = "admin@caosvintage.com"
ADMIN_PASSWORD = "CaosAdmin2026!"
CLIENT_EMAIL = "cliente@caosvintage.com"
CLIENT_PASSWORD = "Cliente2026!"


def unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


def _login(client: TestClient, email: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def admin_headers(client: TestClient) -> dict[str, str]:
    return _headers(_login(client, ADMIN_EMAIL, ADMIN_PASSWORD))


@pytest.fixture(scope="session")
def client_headers(client: TestClient) -> dict[str, str]:
    return _headers(_login(client, CLIENT_EMAIL, CLIENT_PASSWORD))


@pytest.fixture(scope="session")
def categories(client: TestClient) -> list[dict]:
    response = client.get("/api/categories")
    assert response.status_code == 200
    return response.json()


@pytest.fixture(scope="session")
def styles(client: TestClient) -> list[dict]:
    response = client.get("/api/styles")
    assert response.status_code == 200
    return response.json()


@pytest.fixture()
def make_product(
    client: TestClient, admin_headers: dict[str, str], categories: list[dict]
) -> Callable[..., dict]:
    """Crea prendas nuevas para que cada test trabaje con stock propio."""

    def factory(**overrides) -> dict:
        payload = {
            "name": f"Prenda Test {unique('p')}",
            "description": "Prenda generada por la suite de pruebas.",
            "category_id": categories[0]["id"],
            "brand": "Test Brand",
            "size": "M",
            "color": "Negro",
            "condition": "muy_bueno",
            "status": "available",
            "purchase_cost": 1000,
            "price": 2500,
            "is_featured": False,
            "style_ids": [],
        }
        payload.update(overrides)
        response = client.post("/api/products", json=payload, headers=admin_headers)
        assert response.status_code == 201, response.text
        return response.json()

    return factory
