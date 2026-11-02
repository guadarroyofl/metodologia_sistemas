# Importar todos los modelos acá hace que SQLAlchemy los conozca
# y pueda crear sus tablas al arrancar la app.
from app.models.alerta_busqueda import AlertaBusqueda
from app.models.categoria import Categoria
from app.models.drop import AvisoDrop, Drop
from app.models.estilo import Estilo
from app.models.feria import Feria
from app.models.imagen_prenda import ImagenPrenda
from app.models.look import Look, look_prenda
from app.models.medida_prenda import MedidaPrenda
from app.models.notificacion import Notificacion, TipoNotificacion
from app.models.pedido import EstadoPedido, Pedido, PedidoItem
from app.models.prenda import EstadoPublicacion, Prenda, prenda_estilo
from app.models.reserva import EstadoReserva, Reserva
from app.models.usuario import Rol, Usuario

__all__ = [
    "AlertaBusqueda",
    "AvisoDrop",
    "Categoria",
    "Drop",
    "EstadoPedido",
    "EstadoPublicacion",
    "EstadoReserva",
    "Estilo",
    "Feria",
    "ImagenPrenda",
    "Look",
    "MedidaPrenda",
    "Notificacion",
    "Pedido",
    "PedidoItem",
    "Prenda",
    "Reserva",
    "Rol",
    "TipoNotificacion",
    "Usuario",
    "look_prenda",
    "prenda_estilo",
]