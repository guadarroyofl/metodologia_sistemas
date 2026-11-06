"""Pruebas de autenticación, recuperación de contraseña y control de acceso por roles."""
from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import CLIENT_EMAIL, CLIENT_PASSWORD, unique


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_login_and_profile(client: TestClient) -> None:
    email = f"{unique('nuevo')}@example.com"
    payload = {"name": "Persona Nueva", "email": email, "password": "ClaveSegura123", "phone": "+54 11 1234 5678"}

    registered = client.post("/api/auth/register", json=payload)
    assert registered.status_code == 201, registered.text
    body = registered.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == email
    assert body["user"]["role"] == "client"

    headers = {"Authorization": f"Bearer {body['access_token']}"}
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["name"] == "Persona Nueva"

    updated = client.patch("/api/auth/me", json={"name": "Persona Actualizada"}, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["name"] == "Persona Actualizada"


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    payload = {
        "name": "Duplicada",
        "email": CLIENT_EMAIL,
        "password": "ClaveSegura123",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"


def test_register_validates_weak_password(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"name": "Débil", "email": f"{unique('debil')}@example.com", "password": "corta"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_login_rejects_wrong_password(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": CLIENT_EMAIL, "password": "ClaveIncorrecta999"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_password_recovery_flow(client: TestClient) -> None:
    email = f"{unique('reset')}@example.com"
    original = "ClaveOriginal123"
    assert (
        client.post(
            "/api/auth/register",
            json={"name": "Reset Test", "email": email, "password": original},
        ).status_code
        == 201
    )

    forgot = client.post("/api/auth/forgot-password", json={"email": email})
    assert forgot.status_code == 200
    token = forgot.json()["reset_token"]
    assert token, "En desarrollo el token debe devolverse para poder probar el flujo."

    reset = client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "ClaveNueva456"},
    )
    assert reset.status_code == 200

    assert (
        client.post("/api/auth/login", json={"email": email, "password": "ClaveNueva456"}).status_code
        == 200
    )
    assert (
        client.post("/api/auth/login", json={"email": email, "password": original}).status_code
        == 401
    )


def test_forgot_password_unknown_email_is_safe(client: TestClient) -> None:
    response = client.post("/api/auth/forgot-password", json={"email": f"{unique('nadie')}@example.com"})
    assert response.status_code == 200
    assert response.json()["reset_token"] is None


def test_change_password(client: TestClient) -> None:
    email = f"{unique('cambio')}@example.com"
    registered = client.post(
        "/api/auth/register",
        json={"name": "Cambio Clave", "email": email, "password": "ClaveInicial123"},
    )
    headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}

    wrong = client.post(
        "/api/auth/me/password",
        json={"current_password": "NoEsLaClave1", "new_password": "ClaveFinal789"},
        headers=headers,
    )
    assert wrong.status_code == 422
    assert wrong.json()["error"]["code"] == "wrong_current_password"

    changed = client.post(
        "/api/auth/me/password",
        json={"current_password": "ClaveInicial123", "new_password": "ClaveFinal789"},
        headers=headers,
    )
    assert changed.status_code == 200

    assert (
        client.post("/api/auth/login", json={"email": email, "password": "ClaveFinal789"}).status_code
        == 200
    )


def test_rbac_users_endpoint(
    client: TestClient, admin_headers: dict[str, str], client_headers: dict[str, str]
) -> None:
    assert client.get("/api/users").status_code == 401
    assert client.get("/api/users", headers=client_headers).status_code == 403

    listing = client.get("/api/users", headers=admin_headers)
    assert listing.status_code == 200
    data = listing.json()
    assert data["total"] >= 4
    assert all("password_hash" not in user for user in data["items"])


def test_admin_user_crud(
    client: TestClient, admin_headers: dict[str, str], client_headers: dict[str, str]
) -> None:
    email = f"{unique('abm')}@example.com"
    created = client.post(
        "/api/users",
        json={"name": "Usuario ABM", "email": email, "password": "AbmUsuario123", "role": "client"},
        headers=admin_headers,
    )
    assert created.status_code == 201, created.text
    user_id = created.json()["id"]

    updated = client.patch(
        f"/api/users/{user_id}",
        json={"name": "Usuario ABM Editado", "role": "admin"},
        headers=admin_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["role"] == "admin"

    # Un administrador no puede desactivarse a sí mismo.
    me = client.get("/api/auth/me", headers=admin_headers).json()
    self_deactivate = client.delete(f"/api/users/{me['id']}", headers=admin_headers)
    assert self_deactivate.status_code == 400

    deactivated = client.delete(f"/api/users/{user_id}", headers=admin_headers)
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False

    forbidden = client.delete(f"/api/users/{user_id}", headers=client_headers)
    assert forbidden.status_code == 403

    login = client.post("/api/auth/login", json={"email": email, "password": "AbmUsuario123"})
    assert login.status_code == 403
    assert login.json()["error"]["code"] == "inactive_user"


def test_client_login_works(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login", json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
    )
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "client"
