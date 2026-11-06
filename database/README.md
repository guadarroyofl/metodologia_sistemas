# Base de datos — CAOS Vintage

Este directorio contiene artefactos SQL reproducibles del modelo relacional:

- **`schema.sql`**: DDL completo de SQLite (tablas, claves primarias, claves foráneas, restricciones `CHECK`, `UNIQUE` e índices). Se genera desde los modelos SQLAlchemy.
- **`seed_demo.sql`**: datos demo (usuarios, categorías, estilos, prendas, ventas, movimientos de inventario e historial de precios IA). Los hashes corresponden a las contraseñas indicadas en el encabezado del archivo.

## Regenerar los archivos

```powershell
.\.venv\Scripts\python.exe scripts\export_schema.py
```

El script crea una base temporal, ejecuta el DDL de SQLAlchemy, carga el seed y exporta el esquema y los `INSERT` por separado.

## Crear una base desde cero

```powershell
sqlite3 database/caos_vintage.db ".read database/schema.sql"
sqlite3 database/caos_vintage.db ".read database/seed_demo.sql"
```

También se puede usar el seed de la aplicación, que es idempotente:

```powershell
cd backend
..\.venv\Scripts\python.exe -m app.db.seed
```

## Integridad referencial

La aplicación activa `PRAGMA foreign_keys=ON` en cada conexión (ver `backend/app/db/session.py`) y define las relaciones con `onDelete`:

| Relación | Regla |
| --- | --- |
| `products.category_id → categories.id` | `RESTRICT` (no se borra una categoría con prendas) |
| `sale_items.sale_id → sales.id` | `CASCADE` |
| `sale_items.product_id → products.id` | `RESTRICT` (se preserva el historial) |
| `password_reset_tokens.user_id → users.id` | `CASCADE` |
| `price_suggestions.user_id → users.id` | `CASCADE` |
| `price_suggestions.product_id → products.id` | `SET NULL` |
| `sales.user_id → users.id` | `RESTRICT` |
| `sales.sold_by_id → users.id` | `SET NULL` |
| `inventory_movements.product_id → products.id` | `RESTRICT` |
| `inventory_movements.created_by_id → users.id` | `SET NULL` |
| `product_styles.product_id/style_id` | `CASCADE` (tabla puente N:M) |
