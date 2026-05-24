import io
import zipfile
from typing import Literal

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from database import require_pool
from repositories import get_client_id, get_saved_compare_or_404, get_saved_seo_or_404
from services.export import compare_table_to_csv, csv_bytes, csv_response, seo_table_to_csv


router = APIRouter()


@router.get("/export/csv/seo/{table_type}")
async def export_seo_csv(
    table_type: Literal["words", "ngrams", "keywords", "spam", "water", "mixed"],
    browser_id: str = Query(..., min_length=1),
):
    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, browser_id)
        result = await get_saved_seo_or_404(conn, client_id)
    headers, rows, filename = seo_table_to_csv(table_type, result)
    return csv_response(headers, rows, filename)


@router.get("/export/csv/compare/{table_type}")
async def export_compare_csv(
    table_type: Literal["words", "ngrams", "keywords"],
    browser_id: str = Query(..., min_length=1),
):
    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, browser_id)
        result = await get_saved_compare_or_404(conn, client_id)
    headers, rows, filename = compare_table_to_csv(table_type, result)
    return csv_response(headers, rows, filename)


@router.get("/export/zip/seo")
async def export_seo_zip(browser_id: str = Query(..., min_length=1)):
    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, browser_id)
        result = await get_saved_seo_or_404(conn, client_id)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for table_type in ["words", "ngrams", "keywords", "spam", "water", "mixed"]:
            headers, rows, filename = seo_table_to_csv(table_type, result)
            archive.writestr(filename, csv_bytes(headers, rows))
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="seo_report.zip"'},
    )
