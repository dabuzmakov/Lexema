import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from config import MAX_DOCUMENT_CHARS


def missing_document_ids(requested_ids: List[str], documents: List[Dict[str, Any]]) -> List[str]:
    if not requested_ids:
        return []

    available_ids = {
        str(value)
        for document in documents
        for value in (document.get("id"), document.get("client_document_id"), document.get("database_id"))
        if value is not None
    }
    normalized_requested_ids = list(
        dict.fromkeys(document_id.strip() for document_id in requested_ids if document_id.strip())
    )
    return [document_id for document_id in normalized_requested_ids if document_id not in available_ids]


def find_document_by_requested_id(documents: List[Dict[str, Any]], requested_id: str) -> Optional[Dict[str, Any]]:
    for document in documents:
        aliases = {
            str(value)
            for value in (document.get("id"), document.get("client_document_id"), document.get("database_id"))
            if value is not None
        }
        if requested_id in aliases:
            return document
    return None


def require_non_empty_document(document: Dict[str, Any], label: str) -> None:
    if not str(document.get("content") or "").strip():
        raise HTTPException(
            status_code=400,
            detail={"code": "DOCUMENT_EMPTY", "document": label, "document_id": document.get("id")},
        )


def total_content_chars(documents: List[Dict[str, Any]]) -> int:
    return sum(len(str(document.get("content") or "")) for document in documents)


def raise_text_limit_exceeded(code: str, actual: int, limit: int) -> None:
    logging.getLogger(__name__).warning("text_limit_exceeded code=%s actual=%s limit=%s", code, actual, limit)
    raise HTTPException(
        status_code=400,
        detail={"code": code, "actual": actual, "limit": limit},
    )


def validate_content_size(content: str, limit: int = MAX_DOCUMENT_CHARS, code: str = "TEXT_TOO_LARGE") -> None:
    actual = len(content)
    if actual > limit:
        raise_text_limit_exceeded(code, actual, limit)


def validate_documents_total_size(documents: List[Dict[str, Any]], limit: int, code: str) -> None:
    actual = total_content_chars(documents)
    if actual > limit:
        raise_text_limit_exceeded(code, actual, limit)


def log_duration(logger: logging.Logger, operation: str, started_at: float, **fields: Any) -> None:
    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    details = " ".join(f"{key}={value}" for key, value in fields.items())
    logger.info("%s finished duration_ms=%s %s", operation, duration_ms, details)
