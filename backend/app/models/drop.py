from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Drop(Base):
    """Colección que se publica en una fecha y hora fijas."""

    __tablename__ = "drops"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    descripcion: Mapped[str] = mapped_column(Text, default="")
    publica_en: Mapped[datetime] = mapped_column(DateTime, index=True)


class AvisoDrop(Base):
    """Usuarios que tocaron "avisame" en un drop."""

    __tablename__ = "avisos_drop"

    # Clave primaria compuesta: un usuario se anota una sola vez por drop
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True
    )
    drop_id: Mapped[int] = mapped_column(ForeignKey("drops.id", ondelete="CASCADE"), primary_key=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())