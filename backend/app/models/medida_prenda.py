from sqlalchemy import CheckConstraint, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MedidaPrenda(Base):
    """Una medida real de la prenda en cm (largo, axila a axila, cintura...)."""

    __tablename__ = "medidas_prenda"
    __table_args__ = (CheckConstraint("valor_cm > 0", name="ck_medida_positiva"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    prenda_id: Mapped[int] = mapped_column(ForeignKey("prendas.id", ondelete="CASCADE"), index=True)
    nombre: Mapped[str] = mapped_column(String(50))
    valor_cm: Mapped[float] = mapped_column(Float)