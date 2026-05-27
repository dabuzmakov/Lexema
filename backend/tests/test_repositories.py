import asyncio
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from repositories import (
    document_to_dict,
    fetch_documents,
    fetch_selected_documents,
    get_latest_result,
    get_saved_compare_or_404,
    get_saved_seo_or_404,
    parse_json_field,
    settings_to_dict,
    split_terms,
)


class FakeConn:
    def __init__(self, rows=None, row=None):
        self.rows = rows or []
        self.row = row
        self.fetch_calls = []
        self.fetchrow_calls = []

    async def fetch(self, query, *args):
        self.fetch_calls.append((query, args))
        return self.rows

    async def fetchrow(self, query, *args):
        self.fetchrow_calls.append((query, args))
        return self.row


def test_split_terms_normalizes_splits_and_deduplicates():
    assert split_terms([" Term, term ", "два; три\nдва"]) == ["term", "два", "три"]


def test_settings_to_dict_returns_defaults_and_row_values():
    assert settings_to_dict(None)["stop_words"]["mode"] == "default"

    row = {
        "stop_words_mode": "custom",
        "custom_stop_words": ["a"],
        "keywords": ["k"],
        "lemmatization": False,
        "ngram_sizes": [2],
        "spam_threshold_percent": 4.5,
    }

    result = settings_to_dict(row)

    assert result == {
        "stop_words": {"mode": "custom", "custom": ["a"]},
        "keywords": ["k"],
        "lemmatization": False,
        "ngrams": {"sizes": [2]},
        "spam": {"threshold_percent": 4.5},
    }


def test_document_to_dict_uses_client_id_and_count_fallbacks():
    created = datetime(2026, 1, 1, tzinfo=timezone.utc)
    row = {
        "id": 7,
        "client_document_id": None,
        "title": "Doc",
        "content": "one two",
        "char_count": 0,
        "raw_word_count": 0,
        "created_at": created,
        "updated_at": None,
    }

    result = document_to_dict(row)

    assert result["id"] == "7"
    assert result["client_document_id"] == "7"
    assert result["database_id"] == 7
    assert result["char_count"] == 7
    assert result["raw_word_count"] == 2
    assert result["created_at"] == created.isoformat()
    assert result["updated_at"] is None


def test_fetch_documents_and_selected_documents_return_public_shape():
    row = {
        "id": 1,
        "client_document_id": "client-1",
        "title": "Doc",
        "content": "text",
        "char_count": 4,
        "raw_word_count": 1,
        "created_at": None,
        "updated_at": None,
    }

    result = asyncio.run(fetch_documents(FakeConn(rows=[row]), 10))
    selected_all = asyncio.run(fetch_selected_documents(FakeConn(rows=[row]), 10, []))
    selected_some = asyncio.run(fetch_selected_documents(FakeConn(rows=[row]), 10, ["client-1"]))

    assert result[0]["id"] == "client-1"
    assert selected_all[0]["database_id"] == 1
    assert selected_some[0]["title"] == "Doc"


def test_latest_result_parses_json_fields():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    row = {
        "analysis_type": "seo",
        "selected_document_ids": '["doc"]',
        "params_snapshot": '{"a": 1}',
        "result": '{"summary": {}}',
        "is_actual": True,
        "invalidation_reason": None,
        "created_at": now,
        "updated_at": now,
    }

    result = asyncio.run(get_latest_result(FakeConn(row=row), 1, "seo"))

    assert parse_json_field('{"x": 1}') == {"x": 1}
    assert result["selected_document_ids"] == ["doc"]
    assert result["params_snapshot"] == {"a": 1}
    assert result["created_at"] == now.isoformat()


def test_saved_result_helpers_raise_404_when_missing():
    conn = FakeConn(row=None)

    with pytest.raises(HTTPException) as seo_error:
        asyncio.run(get_saved_seo_or_404(conn, 1))
    with pytest.raises(HTTPException) as compare_error:
        asyncio.run(get_saved_compare_or_404(conn, 1))

    assert seo_error.value.status_code == 404
    assert seo_error.value.detail["code"] == "ANALYSIS_NOT_FOUND"
    assert compare_error.value.status_code == 404
