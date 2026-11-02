from dataclasses import dataclass


@dataclass
class Prenda:
    nombre: str
    marca: str
    categoria: str
    precio_compra: float