import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.prenda import Prenda


class EstadoReserva(str, enum.Enum):
    ACTIVA = "activa"  # en el carrito, con el reloj corriendo
    CONFIRMADA = "confirmada"  # se compró
    EXPIRADA = "expirada"  # pasaron los 15 minutos sin comprar
    CANCELADA = "cancelada"  # la persona la sacó del carrito


class Reserva(Base):
    __tablename__ = "reservas"
    __table_args__ = (
        # Índice único PARCIAL: solo puede haber UNA reserva "activa" por prenda.
        # Es la garantía, desde la base de datos, de que dos personas
        # no tengan la misma prenda en el carrito al mismo tiempo.
        Index(
            "uq_reserva_activa_por_prenda",
            "prenda_id",
            unique=True,
            sqlite_where=text("estado = 'activa'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    prenda_id: Mapped[int] = mapped_column(ForeignKey("prendas.id", ondelete="CASCADE"), index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    creada_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    expira_en: Mapped[datetime] = mapped_column(DateTime, index=True)
    estado: Mapped[EstadoReserva] = mapped_column(
        Enum(
            EstadoReserva,
            native_enum=False,
            values_callable=lambda estados: [e.value for e in estados],
        ),
        default=EstadoReserva.ACTIVA,
        index=True,
    )

    prenda: Mapped[Prenda] = relationship()