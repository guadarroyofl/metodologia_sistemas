from abc import ABC, abstractmethod


class EstrategiaPrecio(ABC):
    """Interfaz del patrón Strategy: todas las estrategias calculan un precio."""

    nombre = ""

    @abstractmethod
    def calcular(self, prenda):
        ...


class MargenFijo(EstrategiaPrecio):
    """Costo + un porcentaje fijo de ganancia."""

    def __init__(self, porcentaje=100):
        self.porcentaje = porcentaje
        self.nombre = f"Margen fijo {porcentaje}%"

    def calcular(self, prenda):
        return prenda.precio_compra * (1 + self.porcentaje / 100)


class CategoriaYMarca(EstrategiaPrecio):
    """Multiplicador según la categoría, con bonus si la marca es premium."""

    nombre = "Categoría y marca"
    FACTORES = {"Denim": 2.2, "Band Tee": 3, "Y2K": 2.5}
    MARCAS_PREMIUM = ["Levi's", "Wrangler", "Nike"]

    def calcular(self, prenda):
        factor = self.FACTORES.get(prenda.categoria, 2)
        bonus = 1.25 if prenda.marca in self.MARCAS_PREMIUM else 1
        return prenda.precio_compra * factor * bonus


class ClienteIAMock:
    """IA simulada. Una IA real sería otra clase con el mismo método."""

    def estimar_precio(self, prenda):
        return prenda.precio_compra * 2.6


class EvaluadorIA(EstrategiaPrecio):
    """Pide el precio a un cliente de IA y valida la respuesta."""

    nombre = "Evaluador IA"

    def __init__(self, cliente):
        self.cliente = cliente

    def calcular(self, prenda):
        precio = self.cliente.estimar_precio(prenda)
        if precio <= prenda.precio_compra:  # no confiamos a ciegas en la IA
            raise ValueError("La IA sugirió un precio menor o igual al costo")
        return precio