from collections.abc import Generator

from sqlalchemy.orm import Session

from app.core.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """Abre una sesión con la base para un pedido y la cierra al terminar.

    Los endpoints la reciben con Depends(get_db): FastAPI la crea, se la pasa
    y, cuando el pedido termina (bien o con error), ejecuta el finally.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()