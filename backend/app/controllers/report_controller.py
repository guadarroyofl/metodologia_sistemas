"""Controlador de reportes, dashboard y exportaciones."""
from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reportes"], dependencies=[Depends(require_admin)])
dashboard_router = APIRouter(
    prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(require_admin)]
)


@router.get("/summary", summary="Resumen integral de ventas y stock")
def sales_summary(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
) -> dict:
    return ReportService(db).sales_summary(date_from, date_to)


@router.get("/profitability", summary="Rentabilidad por categoría, marca y día")
def profitability(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
) -> dict:
    return ReportService(db).profitability(date_from, date_to)


@router.get("/stock", summary="Estado del inventario unitario")
def stock_report(db: Session = Depends(get_db)) -> dict:
    return ReportService(db).stock()


@router.get("/export", summary="Exportar reporte a CSV, Excel o PDF")
def export_report(
    report: Literal["ventas", "stock", "rentabilidad"] = Query(default="ventas"),
    format: Literal["csv", "xlsx", "pdf"] = Query(default="csv"),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
) -> Response:
    result = ReportService(db).export(report, format, date_from, date_to)
    return Response(
        content=result.content,
        media_type=result.media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{result.filename}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
        },
    )


@dashboard_router.get("", summary="Métricas del panel administrador")
def dashboard(db: Session = Depends(get_db)) -> dict:
    return ReportService(db).dashboard()
