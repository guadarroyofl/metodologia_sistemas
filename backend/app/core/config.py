"""Configuración central de la aplicación, cargada desde variables de entorno."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
load_dotenv(BASE_DIR / ".env")


def _bool_env(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "si"}


@dataclass(frozen=True)
class Settings:
    app_name: str = "CAOS Vintage API"
    app_version: str = "1.0.0"
    api_prefix: str = "/api"
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = _bool_env("DEBUG", True)

    secret_key: str = os.getenv(
        "SECRET_KEY",
        "caos-vintage-dev-secret-key-change-in-production-2026",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    reset_token_expire_minutes: int = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "30"))

    database_url: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(BASE_DIR / 'caos_vintage.db').as_posix()}",
    )
    seed_on_startup: bool = _bool_env("SEED_ON_STARTUP", True)

    frontend_origins: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            origin.strip()
            for origin in os.getenv(
                "FRONTEND_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173",
            ).split(",")
            if origin.strip()
        )
    )

    currency: str = "ARS"
    brand_name: str = "CAOS Vintage"
    frontend_dist: Path = BASE_DIR.parent / "frontend" / "dist"

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


settings = Settings()
