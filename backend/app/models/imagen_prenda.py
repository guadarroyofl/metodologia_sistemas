from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ImagenPrenda(Base):
    __tablename__ = "imagenes_prenda"

    id: Mapped[int] = mapped_column(primary_key=True)
    prenda_id: Mapped[int] = mapped_column(ForeignKey("prendas.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(255))
    orden: Mapped[int] = mapped_column(default=0)  # 0 = foto principal