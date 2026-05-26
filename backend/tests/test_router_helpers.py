import pytest
from fastapi import HTTPException

from routers.common import (
    find_document_by_requested_id,
    missing_document_ids,
    total_content_chars,
    validate_content_size,
    validate_documents_total_size,
)


def test_missing_document_ids_accepts_all_document_aliases():
    documents = [
        {"id": "client-a", "client_document_id": "client-a", "database_id": 10},
        {"id": "client-b", "client_document_id": "client-b", "database_id": 20},
    ]

    assert missing_document_ids(["client-a", "10", "unknown"], documents) == ["unknown"]
    assert find_document_by_requested_id(documents, "20") == documents[1]


def test_text_limit_errors_have_stable_code_payload():
    with pytest.raises(HTTPException) as exc_info:
        validate_content_size("abcdef", limit=3, code="TEXT_TOO_LARGE")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == {"code": "TEXT_TOO_LARGE", "actual": 6, "limit": 3}


def test_total_text_limit_counts_document_content_only():
    documents = [
        {"content": "abc", "title": "ignored"},
        {"content": "de"},
    ]

    assert total_content_chars(documents) == 5
    with pytest.raises(HTTPException) as exc_info:
        validate_documents_total_size(documents, limit=4, code="TOTAL_TOO_LARGE")

    assert exc_info.value.detail["code"] == "TOTAL_TOO_LARGE"
