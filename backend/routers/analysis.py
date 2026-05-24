import logging
import time
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from config import (
    COMPARE_ANALYSIS_TYPE,
    MAX_DOCUMENT_CHARS_PER_COMPARE,
    MAX_TOTAL_CHARS_PER_SEO_ANALYSIS,
    MAX_TOTAL_CHARS_PER_SPELLING_ANALYSIS,
    SEO_ANALYSIS_TYPE,
    SPELLING_ANALYSIS_TYPE,
)
from database import require_pool
from repositories import (
    fetch_selected_documents,
    get_client_id,
    get_settings_record,
    save_analysis_result,
    settings_to_dict,
)
from routers.common import (
    find_document_by_requested_id,
    log_duration,
    missing_document_ids,
    require_non_empty_document,
    total_content_chars,
    validate_content_size,
    validate_documents_total_size,
)
from schemas import AnalysisSettings, CompareAnalysisRequest, SeoAnalysisRequest, SpellingAnalysisRequest
from services.compare_analysis import build_compare_analysis_result
from services.seo_analysis import build_seo_result
from services.spelling_analysis import (
    ENGINE_NAME as SPELLING_ENGINE_NAME,
    MAX_CHECK_TIME_MILLIS as SPELLING_MAX_CHECK_TIME_MILLIS,
    SpellingEngineUnavailable,
    build_spelling_result,
)


logger = logging.getLogger(__name__)
router = APIRouter()


def analysis_success_response(saved_result: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "status": "success",
        "data": {
            "analysis_type": saved_result["analysis_type"],
            "selected_document_ids": saved_result["selected_document_ids"],
            "params_snapshot": saved_result["params_snapshot"],
            "result": saved_result["result"],
            "is_actual": saved_result["is_actual"],
            "invalidation_reason": saved_result["invalidation_reason"],
            "updated_at": saved_result["updated_at"],
        },
    }


@router.post("/analysis/seo")
async def run_seo_analysis(request_data: SeoAnalysisRequest):
    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, request_data.browser_id)
        documents = await fetch_selected_documents(conn, client_id, request_data.document_ids)
        if not documents:
            raise HTTPException(status_code=400, detail="DOCUMENTS_NOT_FOUND")
        missing_ids = missing_document_ids(request_data.document_ids, documents)
        if missing_ids:
            raise HTTPException(
                status_code=400,
                detail={"code": "DOCUMENTS_NOT_FOUND", "missing_document_ids": missing_ids},
            )

        if request_data.params is None:
            settings = AnalysisSettings(**settings_to_dict(await get_settings_record(conn, client_id)))
        else:
            settings = request_data.params

    validate_documents_total_size(
        documents,
        MAX_TOTAL_CHARS_PER_SEO_ANALYSIS,
        "TOTAL_ANALYSIS_TEXT_TOO_LARGE",
    )
    selected_ids = [document["id"] for document in documents]
    params_snapshot = settings.model_dump()
    started_at = time.perf_counter()
    logger.info(
        "seo_analysis started docs_count=%s total_chars=%s",
        len(documents),
        total_content_chars(documents),
    )
    result = await build_seo_result(documents, settings)
    log_duration(logger, "seo_analysis", started_at, docs_count=len(documents), total_chars=total_content_chars(documents))

    async with require_pool().acquire() as conn:
        saved_result = await save_analysis_result(
            conn,
            client_id,
            SEO_ANALYSIS_TYPE,
            selected_ids,
            params_snapshot,
            result,
        )
    return analysis_success_response(saved_result)


@router.post("/analysis/compare")
async def run_compare_analysis(request_data: CompareAnalysisRequest):
    if request_data.document_a_id == request_data.document_b_id:
        raise HTTPException(
            status_code=400,
            detail={"code": "DOCUMENTS_MUST_BE_DIFFERENT"},
        )

    requested_ids = [request_data.document_a_id, request_data.document_b_id]
    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, request_data.browser_id)
        documents = await fetch_selected_documents(conn, client_id, requested_ids)
        missing_ids = missing_document_ids(requested_ids, documents)
        if missing_ids:
            raise HTTPException(
                status_code=400,
                detail={"code": "DOCUMENTS_NOT_FOUND", "missing_document_ids": missing_ids},
            )

        document_a = find_document_by_requested_id(documents, request_data.document_a_id)
        document_b = find_document_by_requested_id(documents, request_data.document_b_id)
        if document_a is None or document_b is None:
            raise HTTPException(
                status_code=400,
                detail={"code": "DOCUMENTS_NOT_FOUND", "missing_document_ids": requested_ids},
            )
        if document_a.get("database_id") == document_b.get("database_id"):
            raise HTTPException(
                status_code=400,
                detail={"code": "DOCUMENTS_MUST_BE_DIFFERENT"},
            )

        require_non_empty_document(document_a, "a")
        require_non_empty_document(document_b, "b")

        settings = AnalysisSettings(**settings_to_dict(await get_settings_record(conn, client_id)))

    validate_content_size(
        str(document_a.get("content") or ""),
        MAX_DOCUMENT_CHARS_PER_COMPARE,
        "COMPARE_DOCUMENT_TOO_LARGE",
    )
    validate_content_size(
        str(document_b.get("content") or ""),
        MAX_DOCUMENT_CHARS_PER_COMPARE,
        "COMPARE_DOCUMENT_TOO_LARGE",
    )
    params_snapshot = settings.model_dump()
    selected_ids = [document_a["id"], document_b["id"]]
    started_at = time.perf_counter()
    logger.info(
        "compare_analysis started total_chars=%s",
        total_content_chars([document_a, document_b]),
    )
    result = await build_compare_analysis_result(document_a, document_b, settings)
    log_duration(
        logger,
        "compare_analysis",
        started_at,
        total_chars=total_content_chars([document_a, document_b]),
    )

    async with require_pool().acquire() as conn:
        saved_result = await save_analysis_result(
            conn,
            client_id,
            COMPARE_ANALYSIS_TYPE,
            selected_ids,
            params_snapshot,
            result,
        )

    return analysis_success_response(saved_result)


@router.post("/analysis/spelling")
async def run_spelling_analysis(request_data: SpellingAnalysisRequest):
    requested_ids = list(
        dict.fromkeys(
            document_id.strip()
            for document_id in request_data.document_ids
            if document_id.strip()
        )
    )
    if not requested_ids:
        raise HTTPException(
            status_code=400,
            detail={"code": "DOCUMENT_IDS_REQUIRED", "message": "Select at least one document"},
        )

    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, request_data.browser_id)
        documents = await fetch_selected_documents(conn, client_id, requested_ids)
        missing_ids = missing_document_ids(requested_ids, documents)
        if missing_ids:
            raise HTTPException(
                status_code=400,
                detail={"code": "DOCUMENTS_NOT_FOUND", "missing_document_ids": missing_ids},
            )
        if not documents:
            raise HTTPException(status_code=400, detail="DOCUMENTS_NOT_FOUND")

    validate_documents_total_size(
        documents,
        MAX_TOTAL_CHARS_PER_SPELLING_ANALYSIS,
        "TOTAL_SPELLING_TEXT_TOO_LARGE",
    )
    started_at = time.perf_counter()
    logger.info(
        "spelling_analysis started docs_count=%s total_chars=%s",
        len(documents),
        total_content_chars(documents),
    )
    try:
        result = await build_spelling_result(documents)
    except SpellingEngineUnavailable as exc:
        logger.exception("spelling_analysis unavailable")
        raise HTTPException(status_code=503, detail="SPELLING_ENGINE_UNAVAILABLE") from exc
    log_duration(
        logger,
        "spelling_analysis",
        started_at,
        docs_count=len(documents),
        total_chars=total_content_chars(documents),
    )

    selected_ids = [document["id"] for document in documents]
    params_snapshot = {
        "language": "auto",
        "engine": SPELLING_ENGINE_NAME,
        "max_check_time_millis": SPELLING_MAX_CHECK_TIME_MILLIS,
    }

    async with require_pool().acquire() as conn:
        saved_result = await save_analysis_result(
            conn,
            client_id,
            SPELLING_ANALYSIS_TYPE,
            selected_ids,
            params_snapshot,
            result,
        )
    return analysis_success_response(saved_result)
