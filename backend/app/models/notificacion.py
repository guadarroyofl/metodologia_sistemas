import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TipoNotificacion(str, enum.Enum):
    ALERTA = "alerta"  # entró una prenda que coincide con una alerta de búsqueda
    DROP = "drop"  # se publicó un drop al que el usuario se anotó


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    tipo: Mapped[TipoNotificacion] = mapped_column(
        Enum(
            TipoNotificacion,
            native_enum=False,
            values_callable=lambda tipos: [t.value for t in tipos],
        )
    )
    mensaje: Mapped[str] = mapped_column(String(255))
    prenda_id: Mapped[int | None] = mapped_column(ForeignKey("prendas.id", ondelete="SET NULL"))
    drop_id: Mapped[int | None] = mapped_column(ForeignKey("drops.id", ondelete="SET NULL"))
    leida: Mapped[bool] = mapped_column(default=False)
    creada_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())