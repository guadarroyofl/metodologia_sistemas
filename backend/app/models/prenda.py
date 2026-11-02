import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.categoria import Categoria
from app.models.estilo import Estilo
from app.models.feria import Feria
from app.models.imagen_prenda import ImagenPrenda
from app.models.medida_prenda import MedidaPrenda


class EstadoPublicacion(str, enum.Enum):
    BORRADOR = "borrador"  # cargada pero todavía no visible en la tienda
    PUBLICADA = "publicada"  # visible y a la venta
    VENDIDA = "vendida"


# Tabla intermedia de la relación muchos a muchos entre prendas y estilos:
# una prenda puede ser "y2k" y "denim" a la vez, y un estilo tiene muchas prendas.
prenda_estilo = Table(
    "prenda_estilo",
    Base.metadata,
    Column("prenda_id", ForeignKey("prendas.id", ondelete="CASCADE"), primary_key=True),
    Column("estilo_id", ForeignKey("estilos.id", ondelete="CASCADE"), primary_key=True),
)


class Prenda(Base):
    __tablename__ = "prendas"
    __table_args__ = (
        CheckConstraint("estado BETWEEN 1 AND 5", name="ck_prenda_estado_1_a_5"),
        CheckConstraint("precio >= 0", name="ck_prenda_precio_positivo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(120))
    descripcion: Mapped[str] = mapped_column(Text, default="")
    marca: Mapped[str | None] = mapped_column(String(80))
    talle: Mapped[str] = mapped_column(String(20))
    decada: Mapped[int] = mapped_column(index=True)  # 1970, 1980, 1990, 2000...
    estado: Mapped[int]  # conservación del 1 (muy gastada) al 5 (como nueva)
    estado_detalle: Mapped[str] = mapped_column(String(255), default="")
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    precio_compra: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))  # solo lo ve admin
    publicacion: Mapped[EstadoPublicacion] = mapped_column(
        Enum(
            EstadoPublicacion,
            native_enum=False,
            values_callable=lambda estados: [e.value for e in estados],
        ),
        default=EstadoPublicacion.BORRADOR,
        index=True,
    )
    categoria_id: Mapped[int] = mapped_column(ForeignKey("categorias.id"), index=True)
    feria_id: Mapped[int | None] = mapped_column(ForeignKey("ferias.id"))
    creado_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    categoria: Mapped[Categoria] = relationship()
    feria: Mapped[Feria | None] = relationship()
    estilos: Mapped[list[Estilo]] = relationship(secondary=prenda_estilo)
    # cascade: si se borra la prenda, se borran también sus medidas y fotos
    medidas: Mapped[list[MedidaPrenda]] = relationship(cascade="all, delete-orphan")
    imagenes: Mapped[list[ImagenPrenda]] = relationship(
        cascade="all, delete-orphan", order_by=ImagenPrenda.orden
    )