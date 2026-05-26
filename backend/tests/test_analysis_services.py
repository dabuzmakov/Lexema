import asyncio

from schemas import AnalysisSettings
from services.compare_analysis import build_compare_analysis_result_sync
from services.seo_analysis import build_seo_result_sync
from services import spelling_analysis


def test_seo_result_keeps_frontend_expected_shape():
    settings = AnalysisSettings(lemmatization=False)
    result = build_seo_result_sync(
        [
            {
                "id": "doc-1",
                "title": "Doc",
                "content": "Очень полезный текст. Например, полезный термин повторяется.",
            }
        ],
        settings,
    )

    assert {"summary", "words", "ngrams", "keywords", "water", "recommendations"} <= set(result)
    assert "water_units_count" in result["water"]
    assert any(row["marker"] == "очень" for row in result["water"]["markers"])
    assert any(row["word"] == "полезный" for row in result["words"])


def test_compare_result_keeps_frontend_expected_shape():
    settings = AnalysisSettings(lemmatization=False)
    document_a = {
        "id": "a",
        "title": "A",
        "content": "Полезный термин повторяется часто.",
        "char_count": 32,
        "raw_word_count": 4,
    }
    document_b = {
        "id": "b",
        "title": "B",
        "content": "Другой термин встречается редко.",
        "char_count": 30,
        "raw_word_count": 4,
    }

    result = build_compare_analysis_result_sync(document_a, document_b, settings)

    assert result["documents"]["a"]["document_id"] == "a"
    assert result["documents"]["b"]["document_id"] == "b"
    assert {"summary", "metrics", "words_comparison", "ngrams_comparison", "similarity"} <= set(result)


def test_spelling_result_reuses_pipeline_without_real_languagetool(monkeypatch):
    def fake_check_document(document):
        return {
            "document_id": document["id"],
            "title": document["title"],
            "language": "ru-RU",
            "languages": ["ru-RU"],
            "text_length": len(document["content"]),
            "truncated": False,
            "checked_char_count": len(document["content"]),
            "issues_count": 0,
            "issues": [],
        }

    monkeypatch.setattr(spelling_analysis, "check_document", fake_check_document)

    result = asyncio.run(
        spelling_analysis.build_spelling_result(
            [{"id": "doc-1", "title": "Doc", "content": "Текст без ошибок"}]
        )
    )

    assert result["summary"]["documents_count"] == 1
    assert result["summary"]["total_issues"] == 0
    assert result["documents"][0]["language"] == "ru-RU"
