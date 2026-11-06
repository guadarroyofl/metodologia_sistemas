# API — CAOS Vintage

Base URL local: `http://127.0.0.1:8010/api`

- Swagger UI: `/api/docs`
- ReDoc: `/api/redoc`
- OpenAPI JSON: `/api/openapi.json`

Todas las respuestas son JSON, excepto las exportaciones (`CSV`, `XLSX`, `PDF`). Las rutas administrativas requieren `Authorization: Bearer <token>` con rol `admin`.

---

## Autenticación

### `POST /auth/register`

Registra un cliente y devuelve un JWT.

```json
{
  "name": "Sofía Cliente",
  "email": "sofia@example.com",
  "password": "ClaveSegura123",
  "phone": "+54 11 5555 0201"
}
```

`201 Created`

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 28800,
  "user": {
    "id": 5,
    "name": "Sofía Cliente",
    "email": "sofia@example.com",
    "role": "client",
    "phone": "+54 11 5555 0201",
    "is_active": true,
    "created_at": "2026-11-06T18:00:00"
  }
}
```

### `POST /auth/login`

```json
{ "email": "admin@caosvintage.com", "password": "CaosAdmin2026!" }
```

`200 OK` → mismo contrato que registro. Errores: `401 invalid_credentials`, `403 inactive_user`.

### `POST /auth/forgot-password`

```json
{ "email": "cliente@caosvintage.com" }
```

`200 OK`

```json
{
  "message": "Si el correo está registrado, te enviamos las instrucciones...",
  "reset_token": "token-sólo-en-desarrollo"
}
```

En `ENVIRONMENT=production`, `reset_token` es `null` y el envío se delega a un proveedor de email.

### `POST /auth/reset-password`

```json
{ "token": "token-recibido", "new_password": "NuevaClave456" }
```

`200 OK` → `{ "message": "Contraseña actualizada correctamente..." }`. El token es de un solo uso y expira a los 30 minutos.

### `GET /auth/me`

`200 OK` → `UserOut`. Requiere JWT.

### `PATCH /auth/me`

```json
{ "name": "Nuevo Nombre", "phone": "+54 11 0000 0000" }
```

### `POST /auth/me/password`

```json
{ "current_password": "ClaveActual123", "new_password": "ClaveNueva456" }
```

Errores: `422 wrong_current_password`, `422` si la nueva clave no cumple la política (mínimo 8 caracteres, una letra y un número).

---

## Usuarios (admin)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/users` | Lista paginada. Query: `search`, `role`, `is_active`, `page`, `page_size`. |
| `POST` | `/users` | Alta con rol. |
| `GET` | `/users/{id}` | Detalle. |
| `PATCH` | `/users/{id}` | Modificación parcial (nombre, email, teléfono, rol, estado, password). |
| `DELETE` | `/users/{id}` | Baja lógica (`is_active=false`). |

```json
{
  "name": "Nueva Admin",
  "email": "admin2@caosvintage.com",
  "password": "AdminClave123",
  "role": "admin"
}
```

Protecciones: no se puede cambiar el propio rol, desactivar la propia cuenta ni dejar el sistema sin administradores activos (`400 business_rule_error`).

---

## Catálogo público

### `GET /products`

Query params:

| Parámetro | Tipo | Descripción |
| --- | --- | --- |
| `q` | string | Búsqueda por nombre, marca, descripción. |
| `category_id` | int | Filtra por categoría. |
| `style` | string | Slug o nombre de estilo. |
| `condition` | enum | `nuevo`, `excelente`, `muy_bueno`, `bueno`, `regular`. |
| `size` | string | Talle. |
| `min_price` / `max_price` | float | Rango de precio. |
| `featured` | bool | Sólo destacadas. |
| `sort` | enum | `newest`, `price_asc`, `price_desc`, `name`. |
| `page` / `page_size` | int | Paginación (máx. 48 en público). |

`200 OK`

```json
{
  "items": [
    {
      "id": 1,
      "sku": "CV-CAM-A1B2C3",
      "name": "Campera de cuero",
      "category": { "id": 2, "name": "Camperas", "slug": "camperas" },
      "brand": "Vintage",
      "size": "M",
      "condition": "muy_bueno",
      "status": "available",
      "price": 45000.0,
      "styles": [{ "id": 1, "name": "Vintage", "slug": "vintage" }],
      "available": true,
      "created_at": "2026-10-01T12:00:00"
    }
  ],
  "total": 26,
  "page": 1,
  "page_size": 12,
  "pages": 3
}
```

> Las respuestas públicas **no** incluyen `purchase_cost`, `margin_amount`, `margin_percent` ni `is_active`.

### `GET /products/featured?limit=6`

Devuelve una lista de prendas destacadas.

### `GET /products/{id}`

`200 OK` → prenda pública. `404 not_found` si no existe o está dada de baja.

### `GET /categories` / `GET /styles`

Listas completas para filtros y formularios.

### ABM de catálogo (admin)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/products/admin/all` | Listado con costos, márgenes y prendas inactivas. |
| `POST` | `/products` | Alta. |
| `PATCH` | `/products/{id}` | Modificación. |
| `DELETE` | `/products/{id}` | Baja lógica. |
| `POST` | `/categories` | Alta de categoría. |
| `PATCH` | `/categories/{id}` | Modificación. |
| `DELETE` | `/categories/{id}` | Baja; `409` si tiene prendas. |
| `POST` | `/styles` | Alta de estilo. |
| `PATCH` | `/styles/{id}` | Modificación. |
| `DELETE` | `/styles/{id}` | Baja; `409` si está asignado. |

Alta de prenda:

```json
{
  "name": "Campera bomber 90s",
  "description": "Cuero genuino, talle M.",
  "category_id": 2,
  "brand": "Vintage",
  "size": "M",
  "color": "Negro",
  "condition": "muy_bueno",
  "status": "available",
  "purchase_cost": 18000,
  "price": 42000,
  "is_featured": true,
  "style_ids": [1, 5]
}
```

Reglas: `price > purchase_cost` (si no, `422`), categoría existente (`404`), estilos existentes (`422 invalid_styles`).

---

## Ventas

### `POST /sales` — checkout (cliente autenticado)

```json
{
  "items": [{ "product_id": 12 }, { "product_id": 18 }],
  "payment_method": "transfer",
  "discount": 2000,
  "notes": "Entregar por correo",
  "customer_name": "Sofía Cliente",
  "customer_email": "cliente@caosvintage.com"
}
```

`200 OK`

```json
{
  "id": 8,
  "code": "CV-20261106-0008",
  "status": "completed",
  "payment_method": "transfer",
  "subtotal": 90000,
  "discount": 2000,
  "total": 88000,
  "customer_name": "Sofía Cliente",
  "items": [
    {
      "id": 20,
      "product_id": 12,
      "product_name": "Campera bomber 90s",
      "quantity": 1,
      "unit_price": 42000,
      "line_total": 42000
    }
  ],
  "total_items": 1,
  "created_at": "2026-11-06T18:10:00"
}
```

Errores habituales:

| Código | `code` | Causa |
| --- | --- | --- |
| `401` | `missing_token` | Sin JWT. |
| `404` | `not_found` | Alguna prenda no existe. |
| `409` | `conflict` | Prenda ya vendida o reservada. |
| `422` | `validation_error` | Producto repetido, descuento mayor al subtotal, datos inválidos. |

### `GET /sales/mine?page=1&page_size=10`

Historial del usuario autenticado (sin costos ni ganancia).

### `GET /sales/{id}`

Detalle de una venta propia. `403` si pertenece a otro cliente.

### Administración de ventas

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/admin/sales` | Filtros: `status`, `search`, `date_from`, `date_to`, `page`, `page_size`. |
| `GET` | `/admin/sales/{id}` | Detalle con `unit_cost`, `line_profit`, `total_cost`, `total_profit`, `margin_percent`. |
| `POST` | `/admin/sales/{id}/cancel` | Cancela y repone stock. Body: `{ "reason": "..." }`. |

Cancelar una venta ya cancelada devuelve `400 business_rule_error`.

---

## Dashboard y reportes (admin)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/dashboard` | Métricas de hoy, mes, mes anterior, crecimiento, stock, alertas, ventas recientes, series mensual/diaria. |
| `GET` | `/reports/summary` | Totales, serie diaria, ventas por categoría, marca, medio de pago, top productos y stock. Acepta `date_from`/`date_to`. |
| `GET` | `/reports/profitability` | Rentabilidad por categoría, marca y día. Acepta fechas. |
| `GET` | `/reports/stock` | Inventario unitario con costo, precio, margen y estado. |
| `GET` | `/reports/export` | Exporta un reporte. |

### `GET /reports/export`

| Parámetro | Valores | Default |
| --- | --- | --- |
| `report` | `ventas`, `stock`, `rentabilidad` | `ventas` |
| `format` | `csv`, `xlsx`, `pdf` | `csv` |
| `date_from` / `date_to` | `YYYY-MM-DD` | rango completo |

Respuesta: archivo con `Content-Disposition: attachment` y el `Content-Type` correspondiente.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8010/api/reports/export?report=rentabilidad&format=xlsx" \
  -o rentabilidad.xlsx
```

---

## Módulos de IA

### `POST /ai/stylist` (público)

```json
{
  "message": "Busco un look Y2K con denim para una salida de noche",
  "preferred_styles": ["Y2K", "Denim"],
  "size": "M",
  "budget_max": 80000,
  "limit": 4
}
```

`200 OK`

```json
{
  "reply": "Encontré 4 prendas que combinan con tu búsqueda...",
  "detected_styles": ["Y2K", "Denim"],
  "suggestions": [
    {
      "product": { "id": 12, "name": "Jean tiro alto", "price": 28000, "...": "..." },
      "reason": "Coincide con el estilo Y2K y está dentro de tu presupuesto.",
      "score": 78.5
    }
  ],
  "outfits": [
    {
      "title": "Noche Y2K",
      "description": "Jean + top + accesorios.",
      "product_ids": [12, 18, 22]
    }
  ],
  "tips": ["Sumá una cartera mini para reforzar el look."]
}
```

### `POST /ai/pricing` (admin)

```json
{
  "purchase_cost": 12000,
  "category_id": 2,
  "condition": "excelente",
  "brand": "Levi's",
  "style_ids": [1, 3],
  "strategy": "balanceado",
  "product_id": 12
}
```

`200 OK`

```json
{
  "suggested_price": 35990,
  "min_price": 30590,
  "max_price": 41390,
  "estimated_profit": 23990,
  "margin_percent": 66.66,
  "markup": 2.99,
  "confidence": 0.87,
  "strategy": "balanceado",
  "category_name": "Camperas",
  "rationale": [
    "Markup base de la categoría Camperas.",
    "Condición excelente: +0%.",
    "Estrategia balanceada: equilibrio entre rotación y margen."
  ],
  "disclaimer": "Sugerencia orientativa generada por un sistema experto...",
  "suggestion_id": 14
}
```

Estrategias: `conservador`, `balanceado`, `agresivo`. Cada llamada persiste el resultado.

### `GET /ai/pricing/history` (admin)

Lista las últimas sugerencias registradas por el administrador autenticado.

---

## Sistema

### `GET /health`

```json
{
  "status": "ok",
  "app": "CAOS Vintage API",
  "version": "1.0.0",
  "environment": "development",
  "database": "sqlite"
}
```

---

## Códigos de error

| HTTP | `code` | Significado |
| --- | --- | --- |
| `400` | `business_rule_error` | Regla de negocio incumplida (auto-desactivación, última admin, venta ya cancelada). |
| `401` | `missing_token`, `invalid_token`, `token_expired`, `inactive_user`, `invalid_credentials` | Autenticación. |
| `403` | `forbidden` | Rol insuficiente. |
| `404` | `not_found` | Recurso inexistente o inactivo. |
| `409` | `conflict`, `integrity_error` | Duplicados, stock ya vendido, restricciones de integridad. |
| `422` | `validation_error`, `invalid_styles`, `wrong_current_password`, `invalid_reset_token`, `expired_reset_token` | Validación. |
| `500` | `internal_server_error`, `export_error` | Error interno controlado. |

Formato uniforme:

```json
{ "error": { "code": "conflict", "message": "Descripción legible.", "details": null } }
```

---

## Ejemplo de sesión completa

```bash
BASE=http://127.0.0.1:8010/api

TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@caosvintage.com","password":"Cliente2026!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -s $BASE/products?page_size=3 | python -m json.tool

curl -s -X POST $BASE/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":1}],"payment_method":"transfer"}' \
  | python -m json.tool
```
