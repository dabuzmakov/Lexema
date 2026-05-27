from fastapi import APIRouter, Query

from database import require_pool
from repositories import get_client_id, get_settings_record, save_settings_record, settings_to_dict
from schemas import SettingsRequest


router = APIRouter()


@router.get("/settings")
async def get_settings(browser_id: str = Query(..., min_length=1)):
    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, browser_id)
        settings = settings_to_dict(await get_settings_record(conn, client_id))
        return {"status": "success", "data": settings}


@router.put("/settings")
async def save_settings(request_data: SettingsRequest):
    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, request_data.browser_id)
        settings = await save_settings_record(conn, client_id, request_data.settings)
        return {"status": "success", "data": settings}
