from datetime import datetime, timezone

from fastapi import APIRouter

from config import DATABASE_URL


router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "lexema-api",
        "db_configured": bool(DATABASE_URL),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
