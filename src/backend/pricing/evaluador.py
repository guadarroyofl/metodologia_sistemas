class EvaluadorPrecios:
    """Contexto del patrón Strategy: delega el cálculo en la estrategia elegida."""

    def __init__(self, estrategia):
        self.estrategia = estrategia

    def cambiar_estrategia(self, estrategia):
        self.estrategia = estrategia

    def evaluar(self, prenda):
        precio_venta = round(self.estrategia.calcular(prenda) / 100) * 100
        return {
            "estrategia": self.estrategia.nombre,
            "precio_venta": precio_venta,
            "ganancia": precio_venta - prenda.precio_compra,
        }