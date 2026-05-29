from fastapi import APIRouter, Query

from config import COMPARE_ANALYSIS_TYPE, SEO_ANALYSIS_TYPE, SPELLING_ANALYSIS_TYPE
from database import require_pool
from repositories import (
    fetch_documents,
    get_client_id,
    get_latest_results,
    get_settings_record,
    settings_to_dict,
)


router = APIRouter()


@router.get("/app/state")
async def get_app_state(browser_id: str = Query(..., min_length=1)):
    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, browser_id)
        settings = settings_to_dict(await get_settings_record(conn, client_id))
        documents = await fetch_documents(conn, client_id)
        latest_results = await get_latest_results(
            conn,
            client_id,
            [SEO_ANALYSIS_TYPE, COMPARE_ANALYSIS_TYPE, SPELLING_ANALYSIS_TYPE],
        )
        return {
            "status": "success",
            "data": {
                "documents": documents,
                "settings": settings,
                "last_results": {
                    "seo": latest_results[SEO_ANALYSIS_TYPE],
                    "compare": latest_results[COMPARE_ANALYSIS_TYPE],
                    "spelling": latest_results[SPELLING_ANALYSIS_TYPE],
                },
            },
        }
