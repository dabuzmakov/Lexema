import pytest

from services import spelling_analysis


class FakeMatch:
    offset = 5
    error_length = 6
    context = "This errror"
    offset_in_context = 5
    replacements = ["error", "terror"]
    rule_id = "MORFOLOGIK_RULE_EN_US"
    category = "TYPOS"
    message = "Possible spelling mistake"
    short_message = "Spelling"
    sentence = "This errror"


def test_detect_language_prefers_cyrillic_on_tie():
    assert spelling_analysis.detect_language("abc") == "en-US"
    assert spelling_analysis.detect_language("тест abc") == "ru-RU"


def test_category_and_severity_normalization():
    assert spelling_analysis.normalize_category(FakeMatch()) == "spelling"
    assert spelling_analysis.severity_for_category("spelling") == "error"
    assert spelling_analysis.severity_for_category("style") == "info"
    assert spelling_analysis.severity_for_category("grammar") == "warning"


def test_normalize_issue_keeps_frontend_contract():
    issue = spelling_analysis.normalize_issue(FakeMatch(), "doc-1", "en-US", 1, "This errror")

    assert issue["id"] == "doc-1:1:MORFOLOGIK_RULE_EN_US:5"
    assert issue["word"] == "errror"
    assert issue["replacements"] == ["error", "terror"]
    assert issue["category"] == "spelling"


def test_check_document_uses_language_tool_and_counts_issues(monkeypatch):
    class FakeTool:
        def check(self, content):
            assert content == "This errror"
            return [FakeMatch()]

    monkeypatch.setattr(spelling_analysis, "get_language_tool", lambda language: FakeTool())

    result = spelling_analysis.check_document({"id": "doc-1", "title": "Doc", "content": "This errror"})

    assert result["language"] == "en-US"
    assert result["issues_count"] == 1
    assert result["issues"][0]["rule_id"] == "MORFOLOGIK_RULE_EN_US"


def test_check_document_wraps_engine_errors(monkeypatch):
    class BrokenTool:
        def check(self, content):
            raise RuntimeError("boom")

    monkeypatch.setattr(spelling_analysis, "get_language_tool", lambda language: BrokenTool())

    with pytest.raises(spelling_analysis.SpellingEngineUnavailable):
        spelling_analysis.check_document({"id": "doc-1", "title": "Doc", "content": "text"})


def test_get_language_tool_wraps_import_or_runtime_errors(monkeypatch):
    def broken_language_tool(*args, **kwargs):
        raise RuntimeError("not available")

    fake_module = type("FakeLanguageToolModule", (), {"LanguageTool": broken_language_tool})
    monkeypatch.setitem(__import__("sys").modules, "language_tool_python", fake_module)
    spelling_analysis._tools.clear()

    with pytest.raises(spelling_analysis.SpellingEngineUnavailable):
        spelling_analysis.get_language_tool("en-US")
