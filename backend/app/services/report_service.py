"""Reportes de ventas, stock y rentabilidad, dashboard y exportaciones."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from app.core.exceptions import ExportError, ValidationError
from app.core.security import utcnow
from app.repositories.report_repository import ReportRepository
from app.repositories.sale_repository import SaleRepository
from app.utils.exporters import MEDIA_TYPES, build_csv, build_pdf, build_xlsx, format_money
from app.services.base_service import BaseService

PAYMENT_LABELS = {
    "cash": "Efectivo",
    "transfer": "Transferencia",
    "card": "Tarjeta",
    "mercadopago": "Mercado Pago",
}
STATUS_LABELS = {"completed": "Completada", "cancelled": "Cancelada"}


@dataclass
class ExportResult:
    content: bytes
    filename: str
    media_type: str


class ReportService(BaseService):
    def __init__(self, db) -> None:  # noqa: ANN001
        super().__init__(db)
        self.reports = ReportRepository(db)
        self.sales = SaleRepository(db)

    @staticmethod
    def resolve_range(
        date_from: date | None, date_to: date | None, default_days: int = 30
    ) -> tuple[datetime, datetime]:
        today = utcnow().date()
        start_date = date_from or (today - timedelta(days=default_days))
        end_date = date_to or today
        if start_date > end_date:
            raise ValidationError("La fecha inicial no puede ser posterior a la fecha final.")
        start = datetime.combine(start_date, time.min)
        end = datetime.combine(end_date, time.max)
        return start, end

    def sales_summary(self, date_from: date | None = None, date_to: date | None = None) -> dict:
        start, end = self.resolve_range(date_from, date_to)
        return {
            "range": {"from": start.date().isoformat(), "to": end.date().isoformat()},
            "totals": self.reports.sales_totals(start, end),
            "daily": self.reports.daily_series(start, end),
            "by_category": self.reports.by_category(start, end),
            "by_brand": self.reports.by_brand(start, end),
            "by_payment": self.reports.by_payment_method(start, end),
            "top_products": self.reports.top_products(start, end),
            "stock": self.reports.stock_summary(),
        }

    def profitability(self, date_from: date | None = None, date_to: date | None = None) -> dict:
        start, end = self.resolve_range(date_from, date_to)
        return {
            "range": {"from": start.date().isoformat(), "to": end.date().isoformat()},
            "totals": self.reports.sales_totals(start, end),
            "by_category": self.reports.by_category(start, end),
            "by_brand": self.reports.by_brand(start, end),
            "daily": self.reports.daily_series(start, end),
        }

    def stock(self) -> dict:
        return {
            "totals": self.reports.stock_summary(),
            "by_category": self.reports.stock_by_category(),
            "products": self.reports.stock_rows(),
        }

    def dashboard(self) -> dict:
        now = utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)
        previous_month_end = month_start - timedelta(microseconds=1)
        previous_month_start = previous_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_30 = now - timedelta(days=30)

        today_totals = self.reports.sales_totals(today_start, now)
        month_totals = self.reports.sales_totals(month_start, now)
        previous_month_totals = self.reports.sales_totals(previous_month_start, previous_month_end)
        growth = 0.0
        if previous_month_totals["revenue"] > 0:
            growth = round(
                (month_totals["revenue"] - previous_month_totals["revenue"])
                / previous_month_totals["revenue"]
                * 100,
                2,
            )
        elif month_totals["revenue"] > 0:
            growth = 100.0

        recent = [
            {
                "id": sale.id,
                "code": sale.code,
                "customer": sale.customer_name or sale.customer.name,
                "total": float(sale.total),
                "profit": float(sale.total_profit),
                "items": sale.total_items,
                "status": sale.status.value,
                "created_at": sale.created_at.isoformat(),
            }
            for sale in self.reports.recent_sales(limit=6)
        ]

        stock = self.reports.stock_summary()
        category_stock = self.reports.stock_by_category()
        alerts = []
        low_categories = [item["category"] for item in category_stock if item["available"] <= 2]
        if low_categories:
            alerts.append(
                "Poco stock disponible en: " + ", ".join(low_categories[:4]) + "."
            )
        if stock["available"] <= 5:
            alerts.append("El catálogo tiene 5 prendas disponibles o menos: reponer es prioridad.")
        if today_totals["sales_count"] == 0:
            alerts.append("Todavía no se registraron ventas hoy.")

        return {
            "today": today_totals,
            "month": month_totals,
            "previous_month": previous_month_totals,
            "growth_percent": growth,
            "lifetime": self.reports.dashboard_totals(),
            "stock": stock,
            "counts": self.reports.counts(),
            "recent_sales": recent,
            "top_products": self.reports.top_products(last_30, now, limit=5),
            "monthly_series": self.reports.monthly_series(6),
            "daily_14": self.reports.daily_series(now - timedelta(days=14), now),
            "category_stock": category_stock,
            "alerts": alerts,
        }

    # ── Exportaciones ─────────────────────────────────────────────────
    @staticmethod
    def _sales_columns() -> list[tuple[str, str]]:
        return [
            ("code", "Código"),
            ("date", "Fecha"),
            ("customer", "Cliente"),
            ("email", "Email"),
            ("items", "Prendas"),
            ("payment", "Pago"),
            ("status", "Estado"),
            ("subtotal", "Subtotal"),
            ("discount", "Descuento"),
            ("total", "Total"),
            ("cost", "Costo"),
            ("profit", "Ganancia"),
            ("margin_percent", "Margen %"),
        ]

    @staticmethod
    def _stock_columns() -> list[tuple[str, str]]:
        return [
            ("sku", "SKU"),
            ("product", "Prenda"),
            ("category", "Categoría"),
            ("brand", "Marca"),
            ("condition", "Estado"),
            ("status", "Disponibilidad"),
            ("cost", "Costo"),
            ("price", "Precio"),
            ("margin", "Margen"),
            ("styles", "Estilos"),
        ]

    @staticmethod
    def _profitability_columns() -> list[tuple[str, str]]:
        return [
            ("category", "Categoría"),
            ("units", "Unidades"),
            ("revenue", "Ingresos"),
            ("cost", "Costo"),
            ("profit", "Ganancia"),
            ("margin_percent", "Margen %"),
        ]

    def export(
        self,
        report_type: str,
        fmt: str,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> ExportResult:
        report_type = report_type.strip().lower()
        fmt = fmt.strip().lower()
        if fmt not in MEDIA_TYPES:
            raise ValidationError("Formato no soportado. Usá csv, xlsx o pdf.")
        if report_type not in {"ventas", "stock", "rentabilidad"}:
            raise ValidationError("Reporte no soportado. Usá ventas, stock o rentabilidad.")

        try:
            if report_type == "ventas":
                start, end = self.resolve_range(date_from, date_to)
                raw_rows = self.reports.sales_rows(start, end)
                for row in raw_rows:
                    row["payment"] = PAYMENT_LABELS.get(row["payment"], row["payment"])
                    row["status"] = STATUS_LABELS.get(row["status"], row["status"])
                columns = self._sales_columns()
                totals = self.reports.sales_totals(start, end)
                title = "Reporte de ventas"
                subtitle = f"Período {start.date().strftime('%d/%m/%Y')} — {end.date().strftime('%d/%m/%Y')}"
                summary = [
                    f"Ventas completadas: {totals['sales_count']} · Prendas vendidas: {totals['units_sold']}",
                    f"Ingresos: {format_money(totals['revenue'])} · Ganancia: {format_money(totals['profit'])} · Margen: {totals['margin_percent']:.1f}%",
                ]
                filename = f"caos_ventas_{start.date()}_{end.date()}"
            elif report_type == "stock":
                raw_rows = self.reports.stock_rows()
                columns = self._stock_columns()
                stock = self.reports.stock_summary()
                title = "Reporte de stock"
                subtitle = f"Inventario al {utcnow().strftime('%d/%m/%Y %H:%M')} · Stock unitario"
                summary = [
                    f"Prendas disponibles: {stock['available']} · Vendidas: {stock['sold']} · Reservadas: {stock['reserved']}",
                    f"Valor de compra: {format_money(stock['inventory_cost'])} · Valor de venta: {format_money(stock['inventory_retail'])} · Ganancia potencial: {format_money(stock['inventory_potential_profit'])}",
                ]
                filename = f"caos_stock_{utcnow().date()}"
            else:
                start, end = self.resolve_range(date_from, date_to)
                raw_rows = self.reports.by_category(start, end)
                columns = self._profitability_columns()
                totals = self.reports.sales_totals(start, end)
                title = "Reporte de rentabilidad"
                subtitle = f"Período {start.date().strftime('%d/%m/%Y')} — {end.date().strftime('%d/%m/%Y')}"
                summary = [
                    f"Ingresos: {format_money(totals['revenue'])} · Costo: {format_money(totals['cost'])}",
                    f"Ganancia: {format_money(totals['profit'])} · Margen: {totals['margin_percent']:.1f}% · Ticket promedio: {format_money(totals['average_ticket'])}",
                ]
                filename = f"caos_rentabilidad_{start.date()}_{end.date()}"

            headers = [label for _, label in columns]
            rows = [[row.get(key, "") for key, _ in columns] for row in raw_rows]

            if fmt == "csv":
                content = build_csv(headers, rows)
            elif fmt == "xlsx":
                content = build_xlsx(
                    title=title, subtitle=subtitle, headers=headers, rows=rows, summary=summary
                )
            else:
                content = build_pdf(
                    title=title, subtitle=subtitle, headers=headers, rows=rows, summary=summary
                )
        except (ValidationError, ExportError):
            raise
        except Exception as exc:  # noqa: BLE001
            raise ExportError("No se pudo generar el archivo de reporte.") from exc

        return ExportResult(
            content=content,
            filename=f"{filename}.{fmt}",
            media_type=MEDIA_TYPES[fmt],
        )
