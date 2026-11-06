"""Generadores de exportaciones CSV, XLSX y PDF sin dependencia del frontend."""
from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any
from xml.sax.saxutils import escape

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

CAOS_DARK = "#231F20"
CAOS_TERRACOTTA = "#B4552D"
CAOS_CREAM = "#F6F0E4"
CAOS_SAGE = "#7C8471"

MEDIA_TYPES = {
    "csv": "text/csv; charset=utf-8",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}


def build_csv(headers: list[str], rows: list[list[Any]]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\r\n")
    writer.writerow(headers)
    writer.writerows(rows)
    return ("\ufeff" + buffer.getvalue()).encode("utf-8")


def build_xlsx(
    *,
    title: str,
    subtitle: str,
    headers: list[str],
    rows: list[list[Any]],
    summary: list[str],
) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = title[:31] or "Reporte"
    sheet.sheet_view.showGridLines = False

    column_count = max(1, len(headers))
    sheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=column_count)
    title_cell = sheet.cell(row=1, column=1, value=title)
    title_cell.font = Font(name="Calibri", size=16, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill("solid", fgColor="231F20")
    title_cell.alignment = Alignment(horizontal="left", vertical="center")
    sheet.row_dimensions[1].height = 30

    sheet.merge_cells(start_row=2, start_column=1, end_row=2, end_column=column_count)
    subtitle_cell = sheet.cell(row=2, column=1, value=subtitle)
    subtitle_cell.font = Font(name="Calibri", size=10, italic=True, color="5F5A55")
    subtitle_cell.alignment = Alignment(horizontal="left", vertical="center")

    row_cursor = 4
    for line in summary:
        sheet.merge_cells(
            start_row=row_cursor, start_column=1, end_row=row_cursor, end_column=column_count
        )
        cell = sheet.cell(row=row_cursor, column=1, value=line)
        cell.font = Font(name="Calibri", size=9, color="231F20")
        row_cursor += 1

    row_cursor += 1
    header_row = row_cursor
    thin = Side(style="thin", color="E6DED2")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    for index, header in enumerate(headers, start=1):
        cell = sheet.cell(row=header_row, column=index, value=header)
        cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="B4552D")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = border
    sheet.row_dimensions[header_row].height = 24

    for row_index, row in enumerate(rows, start=header_row + 1):
        for column_index, value in enumerate(row, start=1):
            cell = sheet.cell(row=row_index, column=column_index, value=value)
            cell.font = Font(name="Calibri", size=9, color="231F20")
            cell.alignment = Alignment(vertical="center", wrap_text=True)
            cell.border = border
            if row_index % 2 == 0:
                cell.fill = PatternFill("solid", fgColor="F6F0E4")
            header = headers[column_index - 1].lower()
            if any(word in header for word in ["total", "precio", "costo", "ganancia", "ingreso", "margen"]):
                if isinstance(value, (int, float)):
                    cell.number_format = '#,##0.00'
        sheet.row_dimensions[row_index].height = 18

    for index, header in enumerate(headers, start=1):
        widths = [len(str(header))]
        widths.extend(len(str(row[index - 1])) for row in rows[:200] if len(row) >= index)
        sheet.column_dimensions[get_column_letter(index)].width = min(42, max(10, max(widths) + 2))

    sheet.freeze_panes = sheet.cell(row=header_row + 1, column=1)
    sheet.auto_filter.ref = (
        f"A{header_row}:{get_column_letter(column_count)}{header_row + max(1, len(rows))}"
    )

    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


def _pdf_footer(canvas, document) -> None:  # noqa: ANN001
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#8A8178"))
    canvas.drawString(12 * mm, 9 * mm, "CAOS Vintage · Reporte generado automáticamente")
    canvas.drawRightString(
        document.pagesize[0] - 12 * mm,
        9 * mm,
        f"Página {canvas.getPageNumber()} · {datetime.now().strftime('%d/%m/%Y %H:%M')}",
    )
    canvas.restoreState()


def build_pdf(
    *,
    title: str,
    subtitle: str,
    headers: list[str],
    rows: list[list[Any]],
    summary: list[str],
) -> bytes:
    output = io.BytesIO()
    page_width, page_height = landscape(A4)
    document = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        leftMargin=10 * mm,
        rightMargin=10 * mm,
        topMargin=12 * mm,
        bottomMargin=14 * mm,
        title=title,
        author="CAOS Vintage",
        subject=subtitle,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CaosTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=21,
        textColor=colors.HexColor(CAOS_DARK),
        alignment=0,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "CaosSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        textColor=colors.HexColor("#6A625B"),
        spaceAfter=8,
    )
    summary_style = ParagraphStyle(
        "CaosSummary",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor(CAOS_DARK),
    )
    cell_style = ParagraphStyle(
        "CaosCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=6.8,
        leading=8.2,
        textColor=colors.HexColor(CAOS_DARK),
    )
    header_style = ParagraphStyle(
        "CaosHeader",
        parent=cell_style,
        fontName="Helvetica-Bold",
        textColor=colors.white,
    )

    story: list = [
        Paragraph(escape(title), title_style),
        Paragraph(escape(subtitle), subtitle_style),
    ]
    for line in summary:
        story.append(Paragraph(escape(line), summary_style))
    story.append(Spacer(1, 6))

    table_data = [[Paragraph(escape(header), header_style) for header in headers]]
    for row in rows:
        table_data.append([Paragraph(escape(str(value)), cell_style) for value in row])

    available_width = page_width - 20 * mm
    weights = []
    for index, header in enumerate(headers):
        longest = max(
            [len(str(header))] + [len(str(row[index])) for row in rows[:100] if len(row) > index]
        )
        weights.append(max(5, min(26, longest)))
    total_weight = sum(weights) or 1
    column_widths = [available_width * weight / total_weight for weight in weights]

    table = Table(table_data, colWidths=column_widths, repeatRows=1)
    table_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(CAOS_DARK)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E4DACC")),
    ]
    for row_index in range(1, len(table_data)):
        if row_index % 2 == 0:
            table_style.append(
                ("BACKGROUND", (0, row_index), (-1, row_index), colors.HexColor(CAOS_CREAM))
            )
    table.setStyle(TableStyle(table_style))
    story.append(table)

    if not rows:
        story.append(Spacer(1, 10))
        story.append(Paragraph("No hay datos para el período seleccionado.", summary_style))

    document.build(story, onFirstPage=_pdf_footer, onLaterPages=_pdf_footer)
    return output.getvalue()


def format_money(value: float | int) -> str:
    return f"${value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
