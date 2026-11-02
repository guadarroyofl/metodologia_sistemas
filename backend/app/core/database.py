from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# El "engine" es la conexión con el archivo de la base de datos.
# check_same_thread=False es necesario en SQLite porque FastAPI puede
# atender cada pedido en un hilo distinto.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)


# SQLite trae las claves foráneas apagadas por defecto: las prendemos en cada
# conexión para que la base rechace, por ejemplo, un pedido de un usuario que no existe.
@event.listens_for(engine, "connect")
def activar_claves_foraneas(conexion, _registro):
    cursor = conexion.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# Fábrica de sesiones: cada pedido HTTP abre su propia sesión con la base.
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    """Clase madre de todos los modelos (tablas)."""