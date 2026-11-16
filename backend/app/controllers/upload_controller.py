"""Carga de imágenes para el catálogo desde el backoffice."""
from __future__ import annotations

import io
import uuid

from fastapi import APIRouter, Depends, File, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.core.dependencies import require_admin
from app.core.exceptions import ValidationError
from app.models.user import User
from app.schemas.upload import ImageUploadOut

router = APIRouter(prefix="/uploads", tags=["Archivos"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIDE = 1600
Image.MAX_IMAGE_PIXELS = 40_000_000


@router.post(
    "/image",
    response_model=ImageUploadOut,
    status_code=status.HTTP_201_CREATED,
    summary="Subir foto de una prenda",
    description=(
        "Recibe una imagen JPG, PNG, WEBP o GIF de hasta 8 MB, la normaliza a WEBP "
        "y devuelve la URL pública para guardarla en `image_url` de la prenda."
    ),
)
async def upload_product_image(
    file: UploadFile = File(..., description="Archivo de imagen"),
    _: User = Depends(require_admin),
) -> ImageUploadOut:
    if file.content_type not in ALLOWED_TYPES:
        raise ValidationError(
            "Formato no soportado. Subí una imagen JPG, PNG, WEBP o GIF.",
            code="unsupported_image_type",
        )

    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    await file.close()
    if not data:
        raise ValidationError("El archivo está vacío.", code="empty_file")
    if len(data) > max_bytes:
        raise ValidationError(
            f"La imagen supera el máximo de {settings.max_upload_mb} MB.",
            code="image_too_large",
        )

    try:
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()
        with Image.open(io.BytesIO(data)) as image:
            image = ImageOps.exif_transpose(image)
            image = image.convert("RGBA") if image.mode in {"RGBA", "LA", "P"} else image.convert("RGB")
            image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            image.save(buffer, format="WEBP", quality=86, method=6)
            width, height = image.size
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as exc:
        raise ValidationError(
            "El archivo no es una imagen válida o está dañado.",
            code="invalid_image",
        ) from exc

    payload = buffer.getvalue()
    filename = f"{uuid.uuid4().hex}.webp"
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    (settings.uploads_dir / filename).write_bytes(payload)

    return ImageUploadOut(
        url=f"/media/{filename}",
        filename=filename,
        width=width,
        height=height,
        size_bytes=len(payload),
    )
