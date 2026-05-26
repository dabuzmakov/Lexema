import asyncio

import pytest
from fastapi import HTTPException

from routers import analysis, app_state, documents, export, health, settings
from schemas import (
    AnalysisSettings,
    CompareAnalysisRequest,
    DocumentCreateRequest,
    DocumentPatchRequest,
    SeoAnalysisRequest,
    SettingsRequest,
    SpellingAnalysisRequest,
)


class FakeAcquire:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakePool:
    def __init__(self, conn=None):
        self.conn = conn or object()

    def acquire(self):
        return FakeAcquire(self.conn)


class FakeDocumentConn:
    def __init__(self):
        self.executed = []

    async def fetchval(self, query, *args):
        return 0

    async def fetchrow(self, query, *args):
        if query.strip().upper().startswith("SELECT"):
            return {"id": 1, "title": "Old", "content": "old text"}
        return {
            "id": 1,
            "client_document_id": "doc-1",
            "title": args[2] if len(args) > 2 else args[1],
            "content": args[3] if len(args) > 3 else args[2],
            "char_count": args[4] if len(args) > 4 else len(args[2]),
            "raw_word_count": args[5] if len(args) > 5 else 1,
            "created_at": None,
            "updated_at": None,
        }

    async def execute(self, query, *args):
        self.executed.append((query, args))
        return "DELETE 1"


def test_health_reports_database_configuration(monkeypatch):
    monkeypatch.setattr(health, "DATABASE_URL", "postgresql://test")

    response = asyncio.run(health.health())

    assert response["status"] == "ok"
    assert response["db_configured"] is True


def test_documents_endpoints_use_repository_and_db_helpers(monkeypatch):
    conn = FakeDocumentConn()
    monkeypatch.setattr(documents, "require_pool", lambda: FakePool(conn))

    async def fake_get_client_id(conn, browser_id):
        return 10

    async def fake_fetch_documents(conn, client_id):
        return [{"id": "doc-1", "title": "Doc"}]

    monkeypatch.setattr(documents, "get_client_id", fake_get_client_id)
    monkeypatch.setattr(documents, "fetch_documents", fake_fetch_documents)

    invalidated = []

    async def fake_invalidate(conn, client_id, reason):
        invalidated.append((client_id, reason))

    monkeypatch.setattr(documents, "invalidate_document_analysis", fake_invalidate)

    listed = asyncio.run(documents.get_documents("browser"))
    created = asyncio.run(
        documents.create_document(
            DocumentCreateRequest(browser_id="browser", title="Doc", content="one two")
        )
    )
    updated = asyncio.run(
        documents.update_document(
            "doc-1",
            DocumentPatchRequest(browser_id="browser", title="New", content="new text"),
        )
    )
    deleted = asyncio.run(documents.delete_document("doc-1", "browser"))

    assert listed["data"][0]["id"] == "doc-1"
    assert created["data"]["title"] == "Doc"
    assert updated["data"]["title"] == "New"
    assert deleted["data"]["message"] == "Document deleted"
    assert invalidated


def test_document_create_rejects_limit(monkeypatch):
    class LimitConn(FakeDocumentConn):
        async def fetchval(self, query, *args):
            return 30

    monkeypatch.setattr(documents, "require_pool", lambda: FakePool(LimitConn()))

    async def fake_get_client_id(conn, browser_id):
        return 10

    monkeypatch.setattr(documents, "get_client_id", fake_get_client_id)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            documents.create_document(
                DocumentCreateRequest(browser_id="browser", title="Doc", content="text")
            )
        )

    assert exc_info.value.detail == "DOCUMENT_LIMIT_REACHED"


def test_settings_endpoints_use_repository_helpers(monkeypatch):
    monkeypatch.setattr(settings, "require_pool", lambda: FakePool())

    async def fake_get_client_id(conn, browser_id):
        return 10

    async def fake_get_settings_record(conn, client_id):
        return {"row": True}

    monkeypatch.setattr(settings, "get_client_id", fake_get_client_id)
    monkeypatch.setattr(settings, "get_settings_record", fake_get_settings_record)
    monkeypatch.setattr(settings, "settings_to_dict", lambda row: {"keywords": ["a"]})

    async def fake_save(conn, client_id, settings_payload):
        return settings_payload.model_dump()

    monkeypatch.setattr(settings, "save_settings_record", fake_save)

    read = asyncio.run(settings.get_settings("browser"))
    saved = asyncio.run(
        settings.save_settings(
            SettingsRequest(browser_id="browser", settings=AnalysisSettings(keywords=["x"]))
        )
    )

    assert read["data"] == {"keywords": ["a"]}
    assert saved["data"]["keywords"] == ["x"]


def test_app_state_endpoint_collects_documents_settings_and_results(monkeypatch):
    monkeypatch.setattr(app_state, "require_pool", lambda: FakePool())

    async def fake_get_client_id(conn, browser_id):
        return 10

    async def fake_get_settings_record(conn, client_id):
        return {"row": True}

    async def fake_fetch_documents(conn, client_id):
        return [{"id": "doc"}]

    async def fake_get_latest_result(conn, client_id, analysis_type):
        return {"analysis_type": analysis_type}

    monkeypatch.setattr(app_state, "get_client_id", fake_get_client_id)
    monkeypatch.setattr(app_state, "get_settings_record", fake_get_settings_record)
    monkeypatch.setattr(app_state, "settings_to_dict", lambda row: {"settings": True})
    monkeypatch.setattr(app_state, "fetch_documents", fake_fetch_documents)
    monkeypatch.setattr(app_state, "get_latest_result", fake_get_latest_result)

    response = asyncio.run(app_state.get_app_state("browser"))

    assert response["data"]["documents"] == [{"id": "doc"}]
    assert response["data"]["last_results"]["seo"]["analysis_type"] == "seo"


def test_export_endpoints_return_streaming_responses(monkeypatch):
    monkeypatch.setattr(export, "require_pool", lambda: FakePool())

    async def fake_get_client_id(conn, browser_id):
        return 10

    async def fake_get_saved_seo_or_404(conn, client_id):
        return {"words": []}

    async def fake_get_saved_compare_or_404(conn, client_id):
        return {"words_comparison": {"common": []}}

    monkeypatch.setattr(export, "get_client_id", fake_get_client_id)
    monkeypatch.setattr(export, "get_saved_seo_or_404", fake_get_saved_seo_or_404)
    monkeypatch.setattr(export, "get_saved_compare_or_404", fake_get_saved_compare_or_404)

    seo_csv = asyncio.run(export.export_seo_csv("words", "browser"))
    compare_csv = asyncio.run(export.export_compare_csv("words", "browser"))
    seo_zip = asyncio.run(export.export_seo_zip("browser"))

    assert seo_csv.media_type == "text/csv; charset=utf-8"
    assert compare_csv.media_type == "text/csv; charset=utf-8"
    assert seo_zip.media_type == "application/zip"


def test_seo_analysis_success_and_missing_documents(monkeypatch):
    document = {"id": "doc-1", "content": "text"}
    monkeypatch.setattr(analysis, "require_pool", lambda: FakePool())

    async def fake_get_client_id(conn, browser_id):
        return 10

    async def fake_fetch_selected_documents(conn, client_id, ids):
        return [document]

    async def fake_fetch_no_documents(conn, client_id, ids):
        return []

    async def fake_get_settings_record(conn, client_id):
        return None

    monkeypatch.setattr(analysis, "get_client_id", fake_get_client_id)
    monkeypatch.setattr(analysis, "fetch_selected_documents", fake_fetch_selected_documents)
    monkeypatch.setattr(analysis, "get_settings_record", fake_get_settings_record)
    monkeypatch.setattr(analysis, "settings_to_dict", lambda row: AnalysisSettings().model_dump())

    async def fake_build(documents_payload, settings_payload):
        return {"summary": {"documents_count": len(documents_payload)}}

    async def fake_save(conn, client_id, analysis_type, selected_ids, params_snapshot, result):
        return {
            "analysis_type": analysis_type,
            "selected_document_ids": selected_ids,
            "params_snapshot": params_snapshot,
            "result": result,
            "is_actual": True,
            "invalidation_reason": None,
            "updated_at": "now",
        }

    monkeypatch.setattr(analysis, "build_seo_result", fake_build)
    monkeypatch.setattr(analysis, "save_analysis_result", fake_save)

    response = asyncio.run(
        analysis.run_seo_analysis(SeoAnalysisRequest(browser_id="browser", document_ids=["doc-1"]))
    )

    assert response["data"]["analysis_type"] == "seo"
    assert response["data"]["result"]["summary"]["documents_count"] == 1

    monkeypatch.setattr(analysis, "fetch_selected_documents", fake_fetch_no_documents)
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(analysis.run_seo_analysis(SeoAnalysisRequest(browser_id="browser", document_ids=[])))

    assert exc_info.value.detail == "DOCUMENTS_NOT_FOUND"


def test_compare_analysis_rejects_same_document_and_succeeds(monkeypatch):
    with pytest.raises(HTTPException) as same_error:
        asyncio.run(
            analysis.run_compare_analysis(
                CompareAnalysisRequest(browser_id="browser", document_a_id="same", document_b_id="same")
            )
        )
    assert same_error.value.detail["code"] == "DOCUMENTS_MUST_BE_DIFFERENT"

    docs = [
        {"id": "a", "database_id": 1, "title": "A", "content": "text a", "char_count": 6},
        {"id": "b", "database_id": 2, "title": "B", "content": "text b", "char_count": 6},
    ]
    monkeypatch.setattr(analysis, "require_pool", lambda: FakePool())

    async def fake_get_client_id(conn, browser_id):
        return 10

    async def fake_fetch_selected_documents(conn, client_id, ids):
        return docs

    async def fake_get_settings_record(conn, client_id):
        return None

    monkeypatch.setattr(analysis, "get_client_id", fake_get_client_id)
    monkeypatch.setattr(analysis, "fetch_selected_documents", fake_fetch_selected_documents)
    monkeypatch.setattr(analysis, "get_settings_record", fake_get_settings_record)
    monkeypatch.setattr(analysis, "settings_to_dict", lambda row: AnalysisSettings().model_dump())

    async def fake_compare(document_a, document_b, settings_payload):
        return {"documents": {"a": {"document_id": document_a["id"]}, "b": {"document_id": document_b["id"]}}}

    async def fake_save(conn, client_id, analysis_type, selected_ids, params_snapshot, result):
        return {
            "analysis_type": analysis_type,
            "selected_document_ids": selected_ids,
            "params_snapshot": params_snapshot,
            "result": result,
            "is_actual": True,
            "invalidation_reason": None,
            "updated_at": "now",
        }

    monkeypatch.setattr(analysis, "build_compare_analysis_result", fake_compare)
    monkeypatch.setattr(analysis, "save_analysis_result", fake_save)

    response = asyncio.run(
        analysis.run_compare_analysis(
            CompareAnalysisRequest(browser_id="browser", document_a_id="a", document_b_id="b")
        )
    )

    assert response["data"]["analysis_type"] == "compare"
    assert response["data"]["selected_document_ids"] == ["a", "b"]


def test_spelling_analysis_validation_success_and_unavailable(monkeypatch):
    with pytest.raises(HTTPException) as empty_error:
        asyncio.run(
            analysis.run_spelling_analysis(
                SpellingAnalysisRequest(browser_id="browser", document_ids=[])
            )
        )
    assert empty_error.value.detail["code"] == "DOCUMENT_IDS_REQUIRED"

    docs = [{"id": "doc-1", "title": "Doc", "content": "text"}]
    monkeypatch.setattr(analysis, "require_pool", lambda: FakePool())

    async def fake_get_client_id(conn, browser_id):
        return 10

    async def fake_fetch_selected_documents(conn, client_id, ids):
        return docs

    monkeypatch.setattr(analysis, "get_client_id", fake_get_client_id)
    monkeypatch.setattr(analysis, "fetch_selected_documents", fake_fetch_selected_documents)

    async def fake_spelling(documents_payload):
        return {"summary": {"documents_count": len(documents_payload)}, "documents": []}

    async def fake_save(conn, client_id, analysis_type, selected_ids, params_snapshot, result):
        return {
            "analysis_type": analysis_type,
            "selected_document_ids": selected_ids,
            "params_snapshot": params_snapshot,
            "result": result,
            "is_actual": True,
            "invalidation_reason": None,
            "updated_at": "now",
        }

    monkeypatch.setattr(analysis, "build_spelling_result", fake_spelling)
    monkeypatch.setattr(analysis, "save_analysis_result", fake_save)

    response = asyncio.run(
        analysis.run_spelling_analysis(
            SpellingAnalysisRequest(browser_id="browser", document_ids=["doc-1"])
        )
    )
    assert response["data"]["analysis_type"] == "spelling"

    async def unavailable(documents_payload):
        raise analysis.SpellingEngineUnavailable()

    monkeypatch.setattr(analysis, "build_spelling_result", unavailable)

    with pytest.raises(HTTPException) as unavailable_error:
        asyncio.run(
            analysis.run_spelling_analysis(
                SpellingAnalysisRequest(browser_id="browser", document_ids=["doc-1"])
            )
        )

    assert unavailable_error.value.status_code == 503
    assert unavailable_error.value.detail == "SPELLING_ENGINE_UNAVAILABLE"
