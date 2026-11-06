"""Punto de entrada FastAPI, manejo centralizado de errores y servicio del frontend."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError

from app.controllers.ai_controller import router as ai_router
from app.controllers.auth_controller import router as auth_router
from app.controllers.catalog_controller import categories_router, styles_router
from app.controllers.product_controller import router as product_router
from app.controllers.report_controller import dashboard_router, router as report_router
from app.controllers.sale_controller import admin_router as admin_sales_router
from app.controllers.sale_controller import router as sales_router
from app.controllers.user_controller import router as user_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.db.session import create_tables
from app.middleware.request_logging import RequestLoggingMiddleware

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("caos")


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_tables()
    if settings.seed_on_startup:
        try:
            from app.db.seed import seed_database

            created = seed_database()
            logger.info("Base de datos lista%s", " (datos demo cargados)" if created else "")
        except Exception:  # noqa: BLE001
            logger.exception("No se pudieron cargar los datos iniciales.")
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "API de e-commerce y backoffice de CAOS Vintage. Arquitectura MVC por capas, "
        "POO, SQLite en 3FN, autenticación JWT, roles, módulos de IA y reportes."
    ),
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
    openapi_url=f"{settings.api_prefix}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.frontend_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Process-Time-Ms"],
)
app.add_middleware(RequestLoggingMiddleware)


# ── Manejo centralizado de excepciones ────────────────────────────────
@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    details = []
    for error in exc.errors():
        location = ".".join(str(part) for part in error.get("loc", []) if part != "body")
        details.append(
            {
                "field": location or "cuerpo",
                "message": error.get("msg", "Valor inválido"),
                "type": error.get("type", "validation_error"),
            }
        )
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "Revisá los datos ingresados: hay campos inválidos o incompletos.",
                "details": details,
            }
        },
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_: Request, exc: IntegrityError) -> JSONResponse:
    logger.warning("Violación de integridad: %s", exc)
    return JSONResponse(
        status_code=409,
        content={
            "error": {
                "code": "integrity_error",
                "message": "La operación viola una regla de integridad de la base de datos.",
                "details": None,
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Error no controlado: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_server_error",
                "message": "Ocurrió un error inesperado. El equipo técnico fue notificado.",
                "details": None,
            }
        },
    )


# ── Rutas de la API ───────────────────────────────────────────────────
api = settings.api_prefix
app.include_router(auth_router, prefix=api)
app.include_router(user_router, prefix=api)
app.include_router(categories_router, prefix=api)
app.include_router(styles_router, prefix=api)
app.include_router(product_router, prefix=api)
app.include_router(sales_router, prefix=api)
app.include_router(admin_sales_router, prefix=api)
app.include_router(ai_router, prefix=api)
app.include_router(report_router, prefix=api)
app.include_router(dashboard_router, prefix=api)


@app.get(f"{api}/health", tags=["Sistema"], summary="Estado del servicio")
def health() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "database": "sqlite" if settings.is_sqlite else "external",
    }


# ── Frontend compilado (despliegue single-service) ────────────────────
if settings.frontend_dist.exists():
    assets_dir = settings.frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str) -> FileResponse:
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Endpoint no encontrado")
        candidate = settings.frontend_dist / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(settings.frontend_dist / "index.html")
else:

    @app.get("/", tags=["Sistema"], include_in_schema=False)
    def root() -> dict:
        return {
            "message": "CAOS Vintage API en funcionamiento.",
            "docs": f"{settings.api_prefix}/docs",
            "frontend": "Ejecutá `npm run dev` en /frontend o compilá con `npm run build`.",
        }
