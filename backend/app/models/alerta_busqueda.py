from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AlertaBusqueda(Base):
    """Filtro guardado por un usuario: se le avisa cuando entra una prenda que coincide.

    Los campos vacíos (None) significan "cualquiera".
    """

    __tablename__ = "alertas_busqueda"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    texto: Mapped[str] = mapped_column(String(100), default="")  # ej: "campera de jean"
    categoria_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id", ondelete="CASCADE"))
    talle: Mapped[str | None] = mapped_column(String(20))
    decada: Mapped[int | None]
    precio_max: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    activa: Mapped[bool] = mapped_column(default=True)
    creada_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())