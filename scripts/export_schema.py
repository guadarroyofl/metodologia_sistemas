"""Genera database/schema.sql y database/seed_demo.sql a partir de los modelos ORM.

Uso (desde la raíz del repositorio):
    .venv\\Scripts\\python.exe scripts\\export_schema.py

Crea una base SQLite temporal, aplica el DDL de SQLAlchemy, carga los datos demo
y exporta por separado el esquema y los INSERT. El archivo de datos contiene los
hashes de las contraseñas demo (PBKDF2), no las contraseñas en texto plano.
"""
from __future__ import annotations

import os
import sqlite3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATABASE_DIR = ROOT / "database"

sys.path.insert(0, str(ROOT / "backend"))

tmp_dir = Path(tempfile.mkdtemp(prefix="caos-schema-"))
db_path = tmp_dir / "export.db"
os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
os.environ["SEED_ON_STARTUP"] = "false"

from app.db.seed import seed_database  # noqa: E402
from app.db.session import create_tables  # noqa: E402

HEADER = """-- CAOS Vintage · Esquema relacional SQLite (3FN)
-- Generado automáticamente por scripts/export_schema.py a partir de SQLAlchemy.
-- Uso: sqlite3 caos_vintage.db < database/schema.sql
"""

DATA_HEADER = """-- CAOS Vintage · Datos demo (usuarios, catálogo, ventas e historial IA)
-- Generado automáticamente por scripts/export_schema.py.
-- Las contraseñas demo son:
--   admin@caosvintage.com / CaosAdmin2026!
--   cliente@caosvintage.com / Cliente2026!
-- Uso: sqlite3 caos_vintage.db < database/seed_demo.sql
"""


def main() -> None:
    create_tables()
    if not seed_database():
        raise SystemExit("No se pudieron generar los datos demo.")

    connection = sqlite3.connect(db_path)
    try:
        dump = list(connection.iterdump())
    finally:
        connection.close()

    schema_lines: list[str] = []
    data_lines: list[str] = []
    for line in dump:
        if line.startswith("INSERT INTO"):
            data_lines.append(line)
        elif line not in {"BEGIN TRANSACTION;", "COMMIT;"}:
            schema_lines.append(line)

    DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    schema_path = DATABASE_DIR / "schema.sql"
    data_path = DATABASE_DIR / "seed_demo.sql"

    schema_path.write_text(
        HEADER
        + "PRAGMA foreign_keys = ON;\nPRAGMA journal_mode = WAL;\n\n"
        + "\n".join(schema_lines)
        + "\n",
        encoding="utf-8",
    )
    data_path.write_text(
        DATA_HEADER
        + "PRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n"
        + "\n".join(data_lines)
        + "\nCOMMIT;\nPRAGMA foreign_keys = ON;\n",
        encoding="utf-8",
    )

    print(f"OK  {schema_path.relative_to(ROOT)} ({schema_path.stat().st_size} bytes)")
    print(f"OK  {data_path.relative_to(ROOT)} ({data_path.stat().st_size} bytes, {len(data_lines)} INSERT)")


if __name__ == "__main__":
    main()
