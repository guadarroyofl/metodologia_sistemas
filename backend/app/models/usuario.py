import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Rol(str, enum.Enum):
    CLIENTE = "cliente"
    ADMIN = "admin"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    # Nunca guardamos la contraseña: solo su hash (bcrypt, etapa 3)
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[Rol] = mapped_column(
        Enum(Rol, native_enum=False, values_callable=lambda roles: [r.value for r in roles]),
        default=Rol.CLIENTE,
    )
    creado_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())