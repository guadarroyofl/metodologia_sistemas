"""Esquemas de carga de archivos."""
from pydantic import BaseModel


class ImageUploadOut(BaseModel):
    url: str
    filename: str
    width: int
    height: int
    size_bytes: int
