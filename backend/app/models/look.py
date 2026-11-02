from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Table, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.prenda import Prenda

# Tabla intermedia: un look tiene varias prendas y una prenda puede estar en varios looks
look_prenda = Table(
    "look_prenda",
    Base.metadata,
    Column("look_id", ForeignKey("looks.id", ondelete="CASCADE"), primary_key=True),
    Column("prenda_id", ForeignKey("prendas.id", ondelete="CASCADE"), primary_key=True),
)


class Look(Base):
    """Outfit armado por un usuario, que se puede compartir con un link."""

    __tablename__ = "looks"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    nombre: Mapped[str] = mapped_column(String(80))
    # Código corto y único para el link compartible: /looks/compartido/<slug>
    slug: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    prendas: Mapped[list[Prenda]] = relationship(secondary=look_prenda)
    