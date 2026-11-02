from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Feria(Base):
    __tablename__ = "ferias"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    ubicacion: Mapped[str | None] = mapped_column(String(150))