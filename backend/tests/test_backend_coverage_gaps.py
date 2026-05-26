import asyncio
import sys
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

import repositories
from routers import analysis
from schemas import (
    AnalysisSettings,
    CompareAnalysisRequest,
    DocumentCreateRequest,
    DocumentPatchRequest,
    NgramSettings,
    SeoAnalysisRequest,
    SpamSettings,
    SpellingAnalysisRequest,
    StopWordsSettings,
)
from services import compare_analysis, seo_analysis, spelling_analysis
from services import dictionaries, structure_analysis, text_utils


class SequencedConn:
    def __init__(self, fetchrow_results=None, fetchval_result=1, fetch_results=None):
        self.fetchrow_results = list(fetchrow_results or [])
        self.fetchval_result = fetchval_result
        self.fetch_results = list(fetch_results or [])
        self.fetchrow_calls = []
        self.fetchval_calls = []
        self.execute_calls = []

    async def fetchval(self, query, *args):
        self.fetchval_calls.append((query, args))
        return self.fetchval_result

    async def fetchrow(self, query, *args):
        self.fetchrow_calls.append((query, args))
        return self.fetchrow_results.pop(0) if self.fetchrow_results else None

    async def fetch(self, query, *args):
        return self.fetch_results

    async def execute(self, query, *args):
        self.execute_calls.append((query, args))
        return "UPDATE 1"


class FakeAcquire:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakePool:
    def __init__(self, conn):
        self.conn = conn

    def acquire(self):
        return FakeAcquire(self.conn)


def settings_row(**overrides):
    row = {
        "stop_words_mode": "default",
        "custom_stop_words": [],
        "keywords": [],
        "lemmatization": True,
        "ngram_sizes": [2, 3],
        "spam_threshold_percent": 3,
    }
    row.update(overrides)
    return row


def saved_result_row():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return {
        "analysis_type": "seo",
        "selected_document_ids": ["doc"],
        "params_snapshot": {"x": 1},
        "result": {"summary": {}},
        "is_actual": True,
        "invalidation_reason": None,
        "created_at": None,
        "updated_at": now,
    }


def test_repository_write_helpers_and_successful_saved_results():
    with pytest.raises(HTTPException):
        asyncio.run(repositories.get_client_id(SequencedConn(), "   "))

    client_conn = SequencedConn(fetchval_result=42)
    assert asyncio.run(repositories.get_client_id(client_conn, " browser ")) == 42
    assert client_conn.fetchval_calls[0][1] == ("browser",)

    existing = settings_row(stop_words_mode="custom")
    assert asyncio.run(repositories.get_settings_record(SequencedConn(fetchrow_results=[existing]), 1)) == existing

    inserted = settings_row(keywords=["term"])
    insert_conn = SequencedConn(fetchrow_results=[None, inserted])
    assert asyncio.run(repositories.get_settings_record(insert_conn, 1)) == inserted
    assert len(insert_conn.fetchrow_calls) == 2

    save_conn = SequencedConn(fetchrow_results=[settings_row(custom_stop_words=["a"], keywords=["k"], ngram_sizes=[2])])
    saved_settings = asyncio.run(
        repositories.save_settings_record(
            save_conn,
            1,
            AnalysisSettings(
                stop_words=StopWordsSettings(mode="default_custom", custom=["a, a"]),
                keywords=["k; k"],
                ngrams=NgramSettings(sizes=[1, 2, 4]),
            ),
        )
    )
    assert saved_settings["keywords"] == ["k"]
    assert save_conn.execute_calls[0][1][1] == ["seo", "compare"]

    result_conn = SequencedConn(fetchrow_results=[saved_result_row()])
    saved = asyncio.run(
        repositories.save_analysis_result(result_conn, 1, "seo", ["doc"], {"x": 1}, {"summary": {}})
    )
    assert saved["selected_document_ids"] == ["doc"]
    assert saved["created_at"] is None

    latest_conn = SequencedConn(fetchrow_results=[saved_result_row(), saved_result_row()])
    assert asyncio.run(repositories.get_saved_seo_or_404(latest_conn, 1)) == {"summary": {}}
    assert asyncio.run(repositories.get_saved_compare_or_404(latest_conn, 1)) == {"summary": {}}

    invalidate_conn = SequencedConn()
    asyncio.run(repositories.invalidate_document_analysis(invalidate_conn, 1, "changed"))
    assert set(invalidate_conn.execute_calls[0][1][1]) == {"seo", "compare", "spelling"}


def test_schema_validators_reject_blank_strings_and_strip_identifiers():
    with pytest.raises(ValidationError):
        DocumentCreateRequest(browser_id="b", title="   ", content="text")
    with pytest.raises(ValidationError):
        DocumentPatchRequest(browser_id="b", content="   ")
    with pytest.raises(ValidationError):
        CompareAnalysisRequest(browser_id="b", document_a_id=" ", document_b_id="b")

    request = CompareAnalysisRequest(browser_id=" browser ", document_a_id=" a ", document_b_id=" b ")
    assert request.browser_id == "browser"
    assert request.document_a_id == "a"
    assert request.document_b_id == "b"
    assert DocumentPatchRequest(browser_id="b", title=None).title is None


def test_spelling_extra_branches(monkeypatch):
    class Match:
        def __init__(self, category="", rule_issue_type="", rule_id="RULE"):
            self.category = category
            self.rule_issue_type = rule_issue_type
            self.rule_id = rule_id

    assert spelling_analysis.normalize_category(Match(rule_issue_type="grammar")) == "grammar"
    assert spelling_analysis.normalize_category(Match(category="typography")) == "typography"
    assert spelling_analysis.normalize_category(Match(category="style")) == "style"
    assert spelling_analysis.normalize_category(Match(category="punctuation")) == "punctuation"
    assert spelling_analysis.normalize_category(Match(category="other")) == "other"
    assert spelling_analysis.get_match_value(object(), "missing", default="fallback") == "fallback"

    counted = spelling_analysis.count_categories(
        [
            {
                "issues": [
                    {"category": "spelling"},
                    {"category": "grammar"},
                    {"category": "style"},
                    {"category": "typography"},
                    {"category": "punctuation"},
                    {"category": "other"},
                ]
            }
        ]
    )
    assert counted == {
        "spelling_count": 1,
        "grammar_count": 1,
        "style_count": 1,
        "typography_count": 1,
        "punctuation_count": 1,
        "other_count": 1,
    }

    class FakeTool:
        def check(self, content):
            raise AssertionError("blank content should not be checked")

    original_get_language_tool = spelling_analysis.get_language_tool
    monkeypatch.setattr(spelling_analysis, "get_language_tool", lambda language: FakeTool())
    blank = spelling_analysis.check_document({"database_id": 7, "content": ""})
    assert blank["document_id"] == "7"
    assert blank["issues"] == []

    class CreatedTool:
        pass

    fake_module = type(
        "FakeLanguageToolModule",
        (),
        {"LanguageTool": lambda language, config: CreatedTool()},
    )
    monkeypatch.setattr(spelling_analysis, "get_language_tool", original_get_language_tool)
    monkeypatch.setitem(sys.modules, "language_tool_python", fake_module)
    spelling_analysis._tools.clear()
    first = spelling_analysis.get_language_tool("en-US")
    second = spelling_analysis.get_language_tool("en-US")
    assert first is second


def test_seo_extra_modes_recommendations_and_async_wrapper(monkeypatch):
    assert seo_analysis.make_ngrams(["a", "b"], [1, 2])[("a b", 2)] == 1

    markers = seo_analysis.count_water_markers(
        ["very", "much", "very"],
        "very much very",
        {"very"},
        {"very much"},
    )
    assert markers["very much"] == 1
    assert markers["very"] == 1

    documents = [{"id": "doc", "title": "Doc", "content": "repeat repeat repeat p\u0435ka"}]
    settings = AnalysisSettings(
        stop_words=StopWordsSettings(mode="off", custom=["repeat"]),
        keywords=["missing", "repeat"],
        lemmatization=False,
        spam=SpamSettings(threshold_percent=10),
    )
    result = seo_analysis.build_seo_result_sync(documents, settings)
    assert result["summary"]["keywords_missing"] == 1
    assert result["summary"]["mixed_alphabet_count"] == 1
    assert any(row["keyword"] == "missing" and row["status"] == "missing" for row in result["keywords"])
    assert any(row["keyword"] == "repeat" and row["status"] == "spam" for row in result["keywords"])

    custom_result = seo_analysis.build_seo_result_sync(
        [{"id": "doc", "title": "Doc", "content": "alpha beta"}],
        AnalysisSettings(stop_words=StopWordsSettings(mode="custom", custom=["alpha"]), lemmatization=False),
    )
    assert "alpha" not in {row["word"] for row in custom_result["words"]}

    default_custom_result = seo_analysis.build_seo_result_sync(
        [{"id": "doc", "title": "Doc", "content": "alpha beta"}],
        AnalysisSettings(stop_words=StopWordsSettings(mode="default_custom", custom=["alpha"]), lemmatization=False),
    )
    assert "alpha" not in {row["word"] for row in default_custom_result["words"]}

    async def fake_run_in_threadpool(func, *args):
        return func(*args)

    monkeypatch.setattr(seo_analysis, "run_in_threadpool", fake_run_in_threadpool)
    async_result = asyncio.run(seo_analysis.build_seo_result(documents, settings))
    assert async_result["summary"]["documents_count"] == 1


def test_compare_extra_branches_and_async_wrapper(monkeypatch):
    assert compare_analysis.get_number("bad", default=7) == 7
    assert compare_analysis.calculate_cosine_similarity_percent({"a": 0}, {"a": 0}) == 0
    assert compare_analysis.build_ngram_map([{"phrase": "", "size": 2}]) == {}

    keyword_rows = compare_analysis.compare_keywords(
        [
            {"keyword": "same", "count": 1, "density": 1},
            {"keyword": "missing-b", "count": 1, "density": 1},
            {"keyword": "lower", "count": 1, "density": 1},
        ],
        [
            {"keyword": "same", "count": 1, "density": 1},
            {"keyword": "lower", "count": 2, "density": 2},
        ],
    )
    statuses = {row["keyword"]: row["status"] for row in keyword_rows}
    assert statuses == {"same": "same", "missing-b": "missing_in_b", "lower": "lower_in_a"}

    assert compare_analysis.build_structure_comparison(None, {"paragraphs_count": 1}) is None

    insights = compare_analysis.build_insights(
        {"word_count_diff": -2, "vocabulary_overlap_percent": 20},
        [{"status": "missing_in_a"}],
        {"diff_percent": -6},
    )
    assert {item["code"] for item in insights} == {
        "A_SHORTER_THAN_B",
        "KEYWORDS_MISSING_IN_A",
        "A_WATER_LOWER",
        "LOW_VOCABULARY_OVERLAP",
    }

    longer_insights = compare_analysis.build_insights(
        {"word_count_diff": 3, "vocabulary_overlap_percent": 90},
        [],
        {"diff_percent": 6},
    )
    assert {item["code"] for item in longer_insights} == {"A_LONGER_THAN_B", "A_WATER_HIGHER"}

    async def fake_run_in_threadpool(func, *args):
        return {"wrapped": func.__name__, "ids": [args[0]["id"], args[1]["id"]]}

    monkeypatch.setattr(compare_analysis, "run_in_threadpool", fake_run_in_threadpool)
    wrapped = asyncio.run(
        compare_analysis.build_compare_analysis_result(
            {"id": "a", "title": "A", "content": "a"},
            {"id": "b", "title": "B", "content": "b"},
            AnalysisSettings(),
        )
    )
    assert wrapped == {"wrapped": "build_compare_analysis_result_sync", "ids": ["a", "b"]}


def test_analysis_router_error_branches(monkeypatch):
    async def fake_get_client_id(conn, browser_id):
        return 1

    async def fake_get_settings_record(conn, client_id):
        return None

    monkeypatch.setattr(analysis, "require_pool", lambda: FakePool(object()))
    monkeypatch.setattr(analysis, "get_client_id", fake_get_client_id)
    monkeypatch.setattr(analysis, "get_settings_record", fake_get_settings_record)
    monkeypatch.setattr(analysis, "settings_to_dict", lambda row: AnalysisSettings().model_dump())

    async def fetch_one(conn, client_id, ids):
        return [{"id": "a", "database_id": 1, "title": "A", "content": "text", "char_count": 4}]

    monkeypatch.setattr(analysis, "fetch_selected_documents", fetch_one)
    with pytest.raises(HTTPException) as missing_compare:
        asyncio.run(
            analysis.run_compare_analysis(
                CompareAnalysisRequest(browser_id="browser", document_a_id="a", document_b_id="b")
            )
        )
    assert missing_compare.value.detail["missing_document_ids"] == ["b"]

    async def fetch_alias_collision(conn, client_id, ids):
        return [
            {"id": "a", "database_id": 1, "title": "A", "content": "text", "char_count": 4},
            {"id": "b", "database_id": 1, "title": "B", "content": "text", "char_count": 4},
        ]

    monkeypatch.setattr(analysis, "fetch_selected_documents", fetch_alias_collision)
    with pytest.raises(HTTPException) as same_db:
        asyncio.run(
            analysis.run_compare_analysis(
                CompareAnalysisRequest(browser_id="browser", document_a_id="a", document_b_id="b")
            )
        )
    assert same_db.value.detail["code"] == "DOCUMENTS_MUST_BE_DIFFERENT"

    async def fetch_empty(conn, client_id, ids):
        return [
            {"id": "a", "database_id": 1, "title": "A", "content": " ", "char_count": 1},
            {"id": "b", "database_id": 2, "title": "B", "content": "text", "char_count": 4},
        ]

    monkeypatch.setattr(analysis, "fetch_selected_documents", fetch_empty)
    with pytest.raises(HTTPException) as empty_doc:
        asyncio.run(
            analysis.run_compare_analysis(
                CompareAnalysisRequest(browser_id="browser", document_a_id="a", document_b_id="b")
            )
        )
    assert empty_doc.value.detail["code"] == "DOCUMENT_EMPTY"

    async def fetch_for_spelling(conn, client_id, ids):
        return [{"id": "a", "database_id": 1, "title": "A", "content": "text", "char_count": 4}]

    monkeypatch.setattr(analysis, "fetch_selected_documents", fetch_for_spelling)
    with pytest.raises(HTTPException) as missing_spelling:
        asyncio.run(analysis.run_spelling_analysis(SpellingAnalysisRequest(browser_id="browser", document_ids=["b"])))
    assert missing_spelling.value.detail["missing_document_ids"] == ["b"]

    async def fetch_none(conn, client_id, ids):
        return []

    monkeypatch.setattr(analysis, "fetch_selected_documents", fetch_none)
    with pytest.raises(HTTPException) as missing_seo:
        asyncio.run(analysis.run_seo_analysis(SeoAnalysisRequest(browser_id="browser", document_ids=["a"])))
    assert missing_seo.value.detail == "DOCUMENTS_NOT_FOUND"


def test_remaining_router_and_common_edge_branches(monkeypatch):
    from routers import common, documents

    assert common.missing_document_ids([], [{"id": "a"}]) == []
    assert common.find_document_by_requested_id([{"id": "a"}], "missing") is None

    async def fake_get_client_id(conn, browser_id):
        return 1

    async def fake_invalidate(conn, client_id, reason):
        return None

    class MissingUpdateConn(SequencedConn):
        async def fetchrow(self, query, *args):
            return None

    monkeypatch.setattr(documents, "require_pool", lambda: FakePool(MissingUpdateConn()))
    monkeypatch.setattr(documents, "get_client_id", fake_get_client_id)
    with pytest.raises(HTTPException) as update_missing:
        asyncio.run(
            documents.update_document(
                "missing",
                DocumentPatchRequest(browser_id="browser", title="Title"),
            )
        )
    assert update_missing.value.detail == "DOCUMENT_NOT_FOUND"

    class MissingDeleteConn(SequencedConn):
        async def execute(self, query, *args):
            return "DELETE 0"

    monkeypatch.setattr(documents, "require_pool", lambda: FakePool(MissingDeleteConn()))
    with pytest.raises(HTTPException) as delete_missing:
        asyncio.run(documents.delete_document("missing", "browser"))
    assert delete_missing.value.detail == "DOCUMENT_NOT_FOUND"

    async def fetch_only_b(conn, client_id, ids):
        return [{"id": "b", "database_id": 2, "title": "B", "content": "text", "char_count": 4}]

    monkeypatch.setattr(analysis, "require_pool", lambda: FakePool(object()))
    monkeypatch.setattr(analysis, "get_client_id", fake_get_client_id)
    monkeypatch.setattr(analysis, "fetch_selected_documents", fetch_only_b)
    monkeypatch.setattr(analysis, "missing_document_ids", lambda requested_ids, docs: [])
    with pytest.raises(HTTPException) as compare_missing_after_alias_check:
        asyncio.run(
            analysis.run_compare_analysis(
                CompareAnalysisRequest(browser_id="browser", document_a_id="a", document_b_id="b")
            )
        )
    assert compare_missing_after_alias_check.value.detail["missing_document_ids"] == ["a", "b"]

    async def fetch_no_docs(conn, client_id, ids):
        return []

    monkeypatch.setattr(analysis, "fetch_selected_documents", fetch_no_docs)
    with pytest.raises(HTTPException) as spelling_missing_after_alias_check:
        asyncio.run(analysis.run_spelling_analysis(SpellingAnalysisRequest(browser_id="browser", document_ids=["a"])))
    assert spelling_missing_after_alias_check.value.detail == "DOCUMENTS_NOT_FOUND"

    async def fetch_seo_doc(conn, client_id, ids):
        return [{"id": "a", "database_id": 1, "title": "A", "content": "alpha", "char_count": 5}]

    async def fake_build_seo(documents_payload, settings_payload):
        return {"summary": {"documents_count": 1}, "settings_mode": settings_payload.stop_words.mode}

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

    monkeypatch.setattr(analysis, "fetch_selected_documents", fetch_seo_doc)
    monkeypatch.setattr(analysis, "build_seo_result", fake_build_seo)
    monkeypatch.setattr(analysis, "save_analysis_result", fake_save)
    seo_response = asyncio.run(
        analysis.run_seo_analysis(
            SeoAnalysisRequest(
                browser_id="browser",
                document_ids=["a"],
                params=AnalysisSettings(stop_words=StopWordsSettings(mode="off")),
            )
        )
    )
    assert seo_response["data"]["result"]["settings_mode"] == "off"


def test_remaining_service_edge_branches(monkeypatch):
    with pytest.raises(ValueError):
        dictionaries.load_word_set("../bad.txt")
    with pytest.raises(FileNotFoundError):
        dictionaries.load_word_set("missing_dictionary.txt")

    assert text_utils.normalize_phrase("!!!") == "!!!"

    class FakeParsed:
        normal_form = "parsed"

    class FakeMorph:
        def parse(self, word):
            return [FakeParsed()]

    monkeypatch.setattr(text_utils, "get_morph_analyzer", lambda: FakeMorph())
    text_utils.lemmatize_word.cache_clear()
    assert text_utils.lemmatize_word("\u0441\u043b\u043e\u0432\u0430") == "parsed"
    assert text_utils.tokenize("\u0441\u043b\u043e\u0432\u0430", lemmatize=True) == ["parsed"]

    monkeypatch.setattr(structure_analysis, "split_paragraphs", lambda text: [])
    monkeypatch.setattr(structure_analysis, "split_sentences", lambda text: [])
    fallback_structure = structure_analysis.analyze_text_structure("word")
    assert fallback_structure["paragraphs_count"] == 1
    assert fallback_structure["paragraphs"][0]["sentences_count"] == 1

    assert compare_analysis.normalize_metric_number(1.25) == 1.25
    assert compare_analysis.build_word_map([{"word": "a", "count": 1}, {"count": 2}]) == {
        "a": {"word": "a", "count": 1}
    }
    ngram_comparison = compare_analysis.compare_ngrams(
        [{"phrase": "a b", "size": 2, "count": 2, "density": 20}],
        [{"phrase": "a b", "n": 2, "count": 1, "density": 10}],
    )
    assert ngram_comparison["common"][0]["phrase"] == "a b"
    assert compare_analysis.keyword_status(1, float("nan"), 1, float("nan")) == "same"

    phrase_keyword_result = seo_analysis.build_seo_result_sync(
        [{"id": "doc", "title": "Doc", "content": "alpha beta"}],
        AnalysisSettings(keywords=["alpha beta"], lemmatization=False, spam=SpamSettings(threshold_percent=90)),
    )
    assert phrase_keyword_result["keywords"][0]["type"] == "ngram"

    clean_result = seo_analysis.build_seo_result_sync(
        [{"id": "doc", "title": "Doc", "content": "alpha beta gamma"}],
        AnalysisSettings(lemmatization=False, spam=SpamSettings(threshold_percent=90)),
    )
    assert clean_result["recommendations"]


def test_last_line_coverage_branches(monkeypatch):
    async def fake_get_client_id(conn, browser_id):
        return 1

    async def fetch_seo_partial(conn, client_id, ids):
        return [{"id": "a", "database_id": 1, "title": "A", "content": "alpha", "char_count": 5}]

    monkeypatch.setattr(analysis, "require_pool", lambda: FakePool(object()))
    monkeypatch.setattr(analysis, "get_client_id", fake_get_client_id)
    monkeypatch.setattr(analysis, "fetch_selected_documents", fetch_seo_partial)

    with pytest.raises(HTTPException) as seo_partial:
        asyncio.run(analysis.run_seo_analysis(SeoAnalysisRequest(browser_id="browser", document_ids=["a", "b"])))
    assert seo_partial.value.detail["missing_document_ids"] == ["b"]

    class FakeMorphAnalyzer:
        def __init__(self, lang):
            self.lang = lang

        def parse(self, word):
            return [type("Parsed", (), {"normal_form": word})()]

    fake_pymorphy = type("FakePymorphy", (), {"MorphAnalyzer": FakeMorphAnalyzer})
    monkeypatch.setitem(sys.modules, "pymorphy3", fake_pymorphy)
    text_utils.get_morph_analyzer.cache_clear()
    assert text_utils.get_morph_analyzer().lang == "ru"
    text_utils.get_morph_analyzer.cache_clear()
    text_utils.lemmatize_word.cache_clear()
