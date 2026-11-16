"""Pruebas de la carga de imágenes del catálogo."""
from __future__ import annotations

import io

from fastapi.testclient import TestClient
from PIL import Image


def _png_bytes(size: tuple[int, int] = (320, 240)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, (180, 85, 45)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_admin_uploads_image_and_gets_public_url(client: TestClient, admin_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/uploads/image",
        files={"file": ("prenda.png", _png_bytes(), "image/png")},
        headers=admin_headers,
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["url"].startswith("/media/")
    assert payload["url"].endswith(".webp")
    assert payload["width"] == 320
    assert payload["height"] == 240
    assert payload["size_bytes"] > 0

    served = client.get(payload["url"])
    assert served.status_code == 200
    assert served.headers["content-type"] == "image/webp"


def test_upload_requires_admin(client: TestClient, client_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/uploads/image",
        files={"file": ("prenda.png", _png_bytes(), "image/png")},
        headers=client_headers,
    )
    assert response.status_code == 403


def test_upload_rejects_non_image(client: TestClient, admin_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/uploads/image",
        files={"file": ("nota.txt", b"no soy una imagen", "text/plain")},
        headers=admin_headers,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "unsupported_image_type"


def test_upload_rejects_fake_image(client: TestClient, admin_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/uploads/image",
        files={"file": ("rota.png", b"\x89PNG\r\n\x1a\n datos falsos", "image/png")},
        headers=admin_headers,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_image"
