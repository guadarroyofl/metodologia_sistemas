# Importar todos los modelos acá hace que SQLAlchemy los conozca
# y pueda crear sus tablas al arrancar la app.
from app.models.categoria import Categoria
from app.models.estilo import Estilo
from app.models.feria import Feria
from app.models.imagen_prenda import ImagenPrenda
from app.models.medida_prenda import MedidaPrenda
from app.models.prenda import EstadoPublicacion, Prenda, prenda_estilo
from app.models.usuario import Rol, Usuario

__all__ = [
    "Categoria",
    "EstadoPublicacion",
    "Estilo",
    "Feria",
    "ImagenPrenda",
    "MedidaPrenda",
    "Prenda",
    "Rol",
    "Usuario",
    "prenda_estilo",
]