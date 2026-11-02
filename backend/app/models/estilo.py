from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Estilo(Base):
    """Etiquetas de estilo: y2k, punk, denim, band tee..."""

    __tablename__ = "estilos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True)