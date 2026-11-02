import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, Enum, Float, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.prenda import Prenda


class EstadoPedido(str, enum.Enum):
    PENDIENTE = "pendiente"
    PAGADO = "pagado"
    ENVIADO = "enviado"
    ENTREGADO = "entregado"
    CANCELADO = "cancelado"


class PedidoItem(Base):
    __tablename__ = "pedido_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id", ondelete="CASCADE"), index=True)
    # unique: una prenda se puede vender UNA sola vez
    prenda_id: Mapped[int] = mapped_column(ForeignKey("prendas.id"), unique=True)
    # Precio copiado al momento de comprar: si después cambia, el pedido no se altera
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    prenda: Mapped[Prenda] = relationship()


class Pedido(Base):
    __tablename__ = "pedidos"
    __table_args__ = (
        CheckConstraint("total >= 0", name="ck_pedido_total_positivo"),
        CheckConstraint("costo_envio >= 0", name="ck_pedido_envio_positivo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    estado: Mapped[EstadoPedido] = mapped_column(
        Enum(
            EstadoPedido,
            native_enum=False,
            values_callable=lambda estados: [e.value for e in estados],
        ),
        default=EstadoPedido.PENDIENTE,
        index=True,
    )
    metodo_pago: Mapped[str] = mapped_column(String(30))
    metodo_envio: Mapped[str] = mapped_column(String(30))
    costo_envio: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    direccion_envio: Mapped[str | None] = mapped_column(String(255))
    # Impacto ambiental estimado de la compra (contador de impacto, etapa 7)
    agua_ahorrada_l: Mapped[float] = mapped_column(Float, default=0)
    co2_ahorrado_kg: Mapped[float] = mapped_column(Float, default=0)
    creado_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    items: Mapped[list[PedidoItem]] = relationship(cascade="all, delete-orphan")