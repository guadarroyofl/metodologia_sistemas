from src.backend.pricing import (
    CategoriaYMarca, ClienteIAMock, EvaluadorIA, EvaluadorPrecios, MargenFijo, Prenda,
)

prenda = Prenda("Campera Levi's 90s", "Levi's", "Denim", 4000)

evaluador = EvaluadorPrecios(MargenFijo(100))
print(evaluador.evaluar(prenda))

evaluador.cambiar_estrategia(CategoriaYMarca())  # cambio de estrategia en ejecución
print(evaluador.evaluar(prenda))

evaluador.cambiar_estrategia(EvaluadorIA(ClienteIAMock()))
print(evaluador.evaluar(prenda))