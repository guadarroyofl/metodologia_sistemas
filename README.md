# CAOS Vintage

Sistema integral de **e-commerce y backoffice** para una tienda de ropa vintage con **stock unitario**: cada prenda existe una sola vez. Incluye tienda pública, carrito, checkout, panel administrador, reportes con exportación, control de stock y dos módulos de inteligencia artificial que funcionan sin servicios externos.

> Trabajo práctico de **Metodología de Sistemas** — arquitectura MVC por capas, programación orientada a objetos, base de datos relacional normalizada en 3FN y despliegue single-service.

---

## Contenido

- [Demo y credenciales](#demo-y-credenciales)
- [Funcionalidades](#funcionalidades)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Puesta en marcha](#puesta-en-marcha)
- [Docker](#docker)
- [Variables de entorno](#variables-de-entorno)
- [Pruebas automatizadas](#pruebas-automatizadas)
- [Base de datos y normalización](#base-de-datos-y-normalización)
- [API](#api)
- [Módulos de IA](#módulos-de-ia)
- [Seguridad](#seguridad)
- [Documentación adicional](#documentación-adicional)
- [Presupuesto y escalabilidad](#presupuesto-y-escalabilidad)
- [Equipo](#equipo)

---

## Demo y credenciales

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@caosvintage.com` | `CaosAdmin2026!` |
| Administrador | `lourdes@caosvintage.com` | `CaosAdmin2026!` |
| Cliente | `cliente@caosvintage.com` | `Cliente2026!` |
| Cliente | `camila@caosvintage.com` | `Cliente2026!` |

La base se carga automáticamente en el primer arranque (`SEED_ON_STARTUP=true`) con 26 prendas, 10 categorías, 10 estilos, 4 usuarios, ventas de ejemplo e historial de precios IA.

> El flujo de recuperación de contraseña no envía correos reales: en `ENVIRONMENT=development` la API devuelve el token de reseteo para poder probarlo. En producción se integra un proveedor de email y el token nunca se expone.

---

## Funcionalidades

### Tienda pública

- Home con prendas destacadas, propuesta de valor y acceso al catálogo.
- Catálogo con búsqueda, filtros por categoría, estilo, talle, condición y rango de precio; ordenamiento y paginación.
- Detalle de prenda con estado de disponibilidad, estilos y sugerencias del Personal Shopper.
- Carrito persistido en `localStorage` con validación de stock unitario.
- Checkout autenticado con método de pago, descuento, notas y datos de contacto.
- Registro, login, recuperación y cambio de contraseña.
- Cuenta de cliente con historial de compras y detalle de cada venta.
- Chat flotante del **Personal Shopper IA** disponible en toda la tienda.

### Backoffice (rol administrador)

- Dashboard con métricas de hoy/mes, crecimiento, stock, alertas y gráficos (Recharts).
- ABM de prendas con costo, precio, margen, estado, estilos y baja lógica.
- ABM de categorías y estilos con restricciones de integridad.
- ABM de usuarios con roles, activación/desactivación y protecciones (no auto-desactivarse, no quedarse sin administradores).
- Gestión de ventas: filtros por estado, fecha y búsqueda; detalle con costo, ganancia y margen; cancelación con reposición de stock.
- Reportes de ventas, rentabilidad y stock con filtros de fecha y gráficos.
- Exportación de reportes a **CSV, XLSX y PDF**.
- Evaluador de precios IA con tres estrategias, explicación y historial persistido.

### Reglas de negocio destacadas

- **Stock unitario**: una prenda sólo puede venderse una vez. El checkout usa una actualización condicional atómica y la tabla `sale_items` tiene `UNIQUE(sale_id, product_id)` + `CHECK(quantity = 1)`.
- **Snapshots históricos**: cada línea de venta guarda precio y costo del momento, por lo que cambiar el precio de una prenda no altera reportes pasados.
- **Baja lógica**: prendas y usuarios se desactivan; las ventas y movimientos se preservan.
- **Cancelación**: repone la prenda al catálogo y registra un movimiento de inventario.
- **Separación de vistas**: las respuestas públicas nunca exponen `purchase_cost`, ganancia ni margen.

---

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6, Recharts, lucide-react |
| Backend | Python 3.12+, FastAPI, Pydantic 2, SQLAlchemy 2 |
| Base de datos | SQLite 3 con claves foráneas activas y WAL |
| Autenticación | JWT (PyJWT) + PBKDF2-SHA256 (260.000 iteraciones) |
| Reportes | openpyxl (XLSX), ReportLab (PDF), CSV nativo |
| Pruebas | pytest + FastAPI TestClient (httpx) |
| Despliegue | Uvicorn, Docker multi-stage, Docker Compose |

La IA es **local y determinística**: no requiere API keys, no envía datos a terceros y es reproducible en la demo.

---

## Arquitectura

Backend en capas, con dependencias unidireccionales:

```
HTTP → Controller (routing/validación de contrato)
     → Service (reglas de negocio, transacciones, autorización)
     → Repository (consultas SQLAlchemy)
     → Model (entidades y relaciones)
```

```
proyecto-met/
├── backend/
│   ├── app/
│   │   ├── controllers/     # Routers FastAPI (capa Controller)
│   │   ├── services/        # Lógica de negocio y transacciones
│   │   ├── repositories/    # Acceso a datos (Repository pattern)
│   │   ├── models/          # Entidades SQLAlchemy (POO)
│   │   ├── schemas/         # DTOs Pydantic de entrada/salida
│   │   ├── ai/              # Motores de Personal Shopper y Pricing (Strategy)
│   │   ├── core/            # Config, seguridad, dependencias, excepciones
│   │   ├── db/              # Engine, sesión, metadata y seed
│   │   ├── middleware/      # Logging y tiempos de respuesta
│   │   ├── utils/           # Exportadores CSV/XLSX/PDF
│   │   └── main.py          # App, handlers globales, montaje de la SPA
│   ├── tests/               # 37 pruebas de integración
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # Páginas públicas y admin/
│   │   ├── components/      # Layouts, UI, chat, tarjetas
│   │   ├── context/         # Auth, carrito, toasts
│   │   ├── lib/             # Cliente HTTP, formato, descargas
│   │   └── types/           # Contratos TypeScript
│   └── vite.config.ts
├── database/                # schema.sql + seed_demo.sql
├── docs/                    # DER, arquitectura, API, presupuesto
├── scripts/                 # setup, run, test, build, export_schema
├── Dockerfile
├── docker-compose.yml
└── README.md
```

En producción, **FastAPI sirve la SPA compilada** desde `frontend/dist` (single-service). En desarrollo, Vite corre en `5173` y hace proxy de `/api` al backend.

Detalle completo en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

---

## Puesta en marcha

### Requisitos

- Python 3.12 o superior
- Node.js 20 o superior
- npm
- (Opcional) Docker Desktop

### Instalación rápida en Windows

```powershell
git clone https://github.com/guadarroyofl/metodologia_sistemas.git
cd metodologia_sistemas
.\scripts\setup.ps1
```

Ese script crea `.venv`, instala dependencias de Python y Node, y carga los datos demo.

### Desarrollo (dos terminales)

```powershell
# Terminal 1 — API en http://127.0.0.1:8010
.\scripts\run-backend.ps1 -Reload

# Terminal 2 — Frontend en http://localhost:5173
.\scripts\run-frontend.ps1
```

- Tienda: <http://localhost:5173>
- Swagger: <http://127.0.0.1:8010/api/docs>
- ReDoc: <http://127.0.0.1:8010/api/redoc>

> El puerto por defecto del backend es **8010** para evitar conflictos con otros servicios locales. Se puede cambiar con `-Port`.

### Modo single-service (sin Vite)

```powershell
.\scripts\build.ps1          # compila frontend/dist
.\scripts\run-backend.ps1    # FastAPI sirve API + SPA en http://127.0.0.1:8010
```

### Instalación manual

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd frontend; npm install; cd ..
cd backend; ..\.venv\Scripts\python.exe -m app.db.seed; cd ..
```

---

## Docker

```bash
cp .env.example .env
# Editar .env y definir una SECRET_KEY segura
docker compose up --build -d
```

La aplicación queda en <http://localhost:8010>. El volumen `caos_vintage_data` persiste la base SQLite en `/app/backend/data`.

```bash
docker compose logs -f          # logs
docker compose down             # detener
docker compose down -v          # detener y borrar datos
```

El contenedor incluye un `HEALTHCHECK` contra `/api/health`.

> **Importante para producción real**: el compose arranca con `SEED_ON_STARTUP=true` para que la demo funcione. Antes de abrir al público, cambiá las contraseñas demo, definí `SEED_ON_STARTUP=false`, `ENVIRONMENT=production` y una `SECRET_KEY` aleatoria. El flujo de recuperación de contraseña requiere integrar un proveedor de email.

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Default | Descripción |
| --- | --- | --- |
| `SECRET_KEY` | clave de desarrollo | Clave de firma JWT. **Obligatorio cambiarla en producción.** |
| `DATABASE_URL` | `sqlite:///backend/caos_vintage.db` | Cadena SQLAlchemy. |
| `ENVIRONMENT` | `development` | `development` expone el token de recuperación. |
| `DEBUG` | `true` | Nivel de logs. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Vida del JWT. |
| `RESET_TOKEN_EXPIRE_MINUTES` | `30` | Vida del token de reseteo. |
| `FRONTEND_ORIGINS` | `localhost:5173,...` | Orígenes CORS separados por coma. |
| `SEED_ON_STARTUP` | `true` | Carga idempotente de datos demo. |

### Frontend

| Variable | Default | Descripción |
| --- | --- | --- |
| `VITE_API_PROXY` | `http://127.0.0.1:8010` | Destino del proxy de Vite en desarrollo. |
| `VITE_API_URL` | vacío | URL absoluta de la API si el frontend se despliega separado. |

---

## Pruebas automatizadas

```powershell
.\scripts\test.ps1
```

o directamente:

```bash
cd backend
../.venv/Scripts/python.exe -m pytest tests -q
```

**37 pruebas de integración** cubren:

- Registro, login, perfil, cambio y recuperación de contraseña.
- RBAC: 401 sin token, 403 para clientes en endpoints administrativos.
- ABM de usuarios con protecciones y baja lógica.
- Catálogo público sin fuga de costos, filtros, ABM de prendas/categorías/estilos.
- Checkout, stock unitario, doble venta, cancelación y reposición.
- Visibilidad de ventas entre clientes.
- Dashboard, reportes, exportaciones CSV/XLSX/PDF.
- Personal Shopper y Evaluador de Precios (estrategias e historial).

La suite usa una base SQLite temporal aislada; no toca la base de desarrollo.

---

## Base de datos y normalización

Modelo relacional de 10 tablas en **Tercera Forma Normal (3FN)**:

`users` · `password_reset_tokens` · `categories` · `styles` · `products` · `product_styles` · `sales` · `sale_items` · `inventory_movements` · `price_suggestions`

- Claves primarias subrogadas (`id`) y claves foráneas explícitas.
- `PRAGMA foreign_keys=ON` en cada conexión.
- Restricciones `CHECK`, `UNIQUE` e índices para consultas frecuentes.
- Snapshot de precio/costo en `sale_items` para preservar historia.
- Tabla puente `product_styles` para la relación N:M entre prendas y estilos.
- Sin grupos repetidos ni dependencias transitivas.

Artefactos SQL listos para usar:

```bash
sqlite3 database/caos_vintage.db ".read database/schema.sql"
sqlite3 database/caos_vintage.db ".read database/seed_demo.sql"
```

Regeneración:

```powershell
.\.venv\Scripts\python.exe scripts\export_schema.py
```

Diagrama DER en Mermaid y justificación de 3FN: [`docs/DER.md`](docs/DER.md).

---

## API

Base URL: `http://127.0.0.1:8010/api`

| Grupo | Endpoints principales |
| --- | --- |
| Autenticación | `POST /auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`; `GET/PATCH /auth/me`; `POST /auth/me/password` |
| Usuarios (admin) | `GET/POST /users`, `GET/PATCH/DELETE /users/{id}` |
| Catálogo | `GET /products`, `/products/featured`, `/products/{id}`; `GET /categories`, `/styles` |
| Admin catálogo | `GET /products/admin/all`; `POST/PATCH/DELETE /products`; ABM de categorías y estilos |
| Ventas | `POST /sales` (checkout), `GET /sales/mine`, `GET /sales/{id}` |
| Admin ventas | `GET /admin/sales`, `GET /admin/sales/{id}`, `POST /admin/sales/{id}/cancel` |
| Dashboard | `GET /dashboard` |
| Reportes | `GET /reports/summary`, `/reports/profitability`, `/reports/stock`, `/reports/export` |
| IA | `POST /ai/stylist`; `POST /ai/pricing`; `GET /ai/pricing/history` |
| Sistema | `GET /health` |

Los errores tienen formato uniforme:

```json
{
  "error": {
    "code": "conflict",
    "message": "La prenda ya no está disponible.",
    "details": null
  }
}
```

Contratos, ejemplos y códigos de estado en [`docs/API.md`](docs/API.md). Documentación interactiva en `/api/docs`.

---

## Módulos de IA

### 1. Personal Shopper (`backend/app/ai/stylist_engine.py`)

Sistema experto de recomendación:

- Detecta estilos y categorías a partir del lenguaje natural (vintage, Y2K, grunge, denim, boho, etc.).
- Puntúa prendas disponibles por coincidencia de estilo, talle, presupuesto, categoría y palabras clave.
- Devuelve hasta 8 sugerencias con explicación del puntaje, tips y combinaciones (outfits).
- No requiere internet ni claves; puede evolucionar a un LLM manteniendo el mismo contrato.

### 2. Evaluador de Precios (`backend/app/ai/pricing_engine.py`)

Sistema experto con **patrón Strategy**:

- Calcula un precio base a partir del costo y un markup por categoría.
- Ajusta por condición, marca y estilos.
- Ofrece tres estrategias: `conservador`, `balanceado`, `agresivo`.
- Devuelve rango mín/máx, ganancia estimada, margen, confianza y justificación.
- Persiste cada evaluación en `price_suggestions` para auditoría.

---

## Seguridad

- Contraseñas con **PBKDF2-SHA256**, sal aleatoria de 16 bytes y 260.000 iteraciones; nunca se almacenan en texto plano.
- JWT firmado con HS256, expiración configurable y validación de tipo de token.
- Tokens de recuperación almacenados **hasheados** (SHA-256), de un solo uso y con expiración.
- Autorización por roles en dependencias (`require_admin`) y en servicios.
- Consultas parametrizadas vía SQLAlchemy (sin SQL concatenado).
- Validación de entrada con Pydantic (tipos, longitudes, emails, reglas de margen).
- Manejo centralizado de excepciones: no se filtran trazas internas al cliente.
- CORS restringido por lista de orígenes.
- Respuestas públicas sin costos ni márgenes.
- En producción: definir `SECRET_KEY` fuerte, `DEBUG=false`, HTTPS detrás de reverse proxy y backups periódicos.

---

## Documentación adicional

| Documento | Contenido |
| --- | --- |
| [`docs/DER.md`](docs/DER.md) | Diagrama entidad-relación en Mermaid, diccionario de datos y justificación 3FN |
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Capas MVC, POO, patrones, flujos, decisiones y estructura del frontend |
| [`docs/API.md`](docs/API.md) | Endpoints, payloads, códigos de estado y ejemplos |
| [`docs/PRESUPUESTO_Y_ESCALABILIDAD.md`](docs/PRESUPUESTO_Y_ESCALABILIDAD.md) | Estimación de costos, horas, infraestructura y hoja de ruta |
| [`database/README.md`](database/README.md) | DDL, seed, reglas de integridad y regeneración |

---

## Presupuesto y escalabilidad

Resumen (detalle en el documento enlazado):

| Concepto | Estimación |
| --- | --- |
| Desarrollo completo (≈330 h) | **USD 7.500 – 11.500** |
| Infraestructura mensual (MVP) | **USD 25 – 90** |
| Dominio anual | **USD 12 – 25** |

Hoja de ruta de escalabilidad: SQLite → PostgreSQL, almacenamiento de imágenes en object storage, caché de catálogo, tareas asíncronas para exports, observabilidad, CDN y despliegue horizontal del backend. Ver [`docs/PRESUPUESTO_Y_ESCALABILIDAD.md`](docs/PRESUPUESTO_Y_ESCALABILIDAD.md).

---

## Equipo

- **Guadalupe Arroyo** — `guadarroyofl <guadalupearroyo2005@gmail.com>`
- **Lourdes Amado** — `luluamadosm <lourdesamado233@gmail.com>`

Repositorio: <https://github.com/guadarroyofl/metodologia_sistemas>

Proyecto académico. Las marcas y prendas de ejemplo son ficticias o de uso demostrativo.
