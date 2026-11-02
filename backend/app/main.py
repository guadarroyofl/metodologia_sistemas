from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.database import Base, engine
import app.models  # noqa: F401  (registra todas las tablas antes de crearlas)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Al arrancar el servidor, crea las tablas que todavía no existan.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_nombre,
    description="API del e-commerce de ropa vintage CAOS.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/api/health", tags=["salud"])
def health():
    """Sirve para comprobar que el servidor está andando."""
    return {"estado": "ok"}
