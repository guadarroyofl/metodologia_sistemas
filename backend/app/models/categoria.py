from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True)
    # Ahorro estimado por prenda de esta categoría frente a comprarla nueva
    # (se usa en el contador de impacto, etapa 7)
    agua_litros_estimada: Mapped[float] = mapped_column(Float, default=0)
    co2_kg_estimado: Mapped[float] = mapped_column(Float, default=0)