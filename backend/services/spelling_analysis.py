import re
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, Tuple

from starlette.concurrency import run_in_threadpool

from services.analysis_runtime import get_spelling_analysis_semaphore


LanguageCode = Literal["ru-RU", "en-US"]

ENGINE_NAME = "LanguageTool"
MAX_CHECK_TIME_MILLIS = 8_000
SUPPORTED_LANGUAGES: Tuple[LanguageCode, LanguageCode] = ("ru-RU", "en-US")
CYRILLIC_RE = re.compile(r"[А-Яа-яЁё]")
LATIN_RE = re.compile(r"[A-Za-z]")

_tools: Dict[str, Any] = {}
_tools_lock = threading.Lock()


class SpellingEngineUnavailable(RuntimeError):
    pass


def detect_language(text: str) -> LanguageCode:
    cyrillic_count = sum(1 for _ in CYRILLIC_RE.finditer(text))
    latin_count = sum(1 for _ in LATIN_RE.finditer(text))

    if cyrillic_count >= latin_count:
        return "ru-RU"
    return "en-US"


def get_language_tool(language: LanguageCode) -> Any:
    with _tools_lock:
        if language in _tools:
            return _tools[language]

        try:
            import language_tool_python

            tool = language_tool_python.LanguageTool(
                language,
                config={
                    "cacheSize": 1000,
                    "pipelineCaching": True,
                    "maxCheckTimeMillis": MAX_CHECK_TIME_MILLIS,
                },
            )
        except Exception as exc:
            raise SpellingEngineUnavailable("SPELLING_ENGINE_UNAVAILABLE") from exc

        _tools[language] = tool
        return tool


def normalize_category(match: Any) -> Optional[str]:
    category = str(getattr(match, "category", "") or "").lower()
    rule_issue_type = str(get_match_value(match, "rule_issue_type", "ruleIssueType", default="") or "").lower()
    rule_id = str(get_match_value(match, "rule_id", "ruleId", default="") or "").lower()

    combined = f"{category} {rule_issue_type} {rule_id}"
    if "typography" in combined:
        return "typography"
    if "typo" in combined or "misspelling" in combined or "morfologik" in combined:
        return "spelling"
    if "grammar" in combined:
        return "grammar"
    if "style" in combined:
        return "style"
    if "punctuation" in combined:
        return "punctuation"
    return None


def severity_for_category(category: str) -> str:
    if category == "spelling":
        return "error"
    if category in {"style", "typography"}:
        return "info"
    return "warning"


def get_match_value(match: Any, *names: str, default: Any = None) -> Any:
    for name in names:
        value = getattr(match, name, None)
        if value is not None:
            return value
    return default


def normalize_issue(
    match: Any,
    document_id: str,
    language: LanguageCode,
    index: int,
    text: str,
) -> Optional[Dict[str, Any]]:
    offset = int(get_match_value(match, "offset", default=0) or 0)
    length = int(get_match_value(match, "error_length", "errorLength", "length", default=0) or 0)
    context = str(get_match_value(match, "context", default="") or "")
    context_offset = int(get_match_value(match, "offset_in_context", "contextoffset", "contextOffset", default=0) or 0)
    replacements = list(get_match_value(match, "replacements", default=[]) or [])
    rule_id = str(get_match_value(match, "rule_id", "ruleId", default="UNKNOWN_RULE") or "UNKNOWN_RULE")
    category = normalize_category(match)
    if category is None:
        return None

    return {
        "id": f"{document_id}:{index}:{rule_id}:{offset}",
        "rule_id": rule_id,
        "message": str(get_match_value(match, "message", default="") or ""),
        "short_message": str(get_match_value(match, "short_message", "shortMessage", default="") or ""),
        "category": category,
        "category_name": str(get_match_value(match, "category", default=category) or category),
        "severity": severity_for_category(category),
        "offset": offset,
        "length": length,
        "context": context,
        "context_offset": context_offset,
        "word": text[offset : offset + length],
        "replacements": replacements[:8],
        "sentence": str(get_match_value(match, "sentence", default="") or ""),
        "language": language,
    }


def check_document(document: Dict[str, Any]) -> Dict[str, Any]:
    content = str(document.get("content") or "")
    document_id = str(document.get("id") or document.get("client_document_id") or document.get("database_id"))
    language = detect_language(content)
    tool = get_language_tool(language)

    try:
        matches = tool.check(content) if content.strip() else []
    except Exception as exc:
        raise SpellingEngineUnavailable("SPELLING_ENGINE_UNAVAILABLE") from exc

    issues = [
        issue
        for index, match in enumerate(matches, start=1)
        if (issue := normalize_issue(match, document_id, language, index, content)) is not None
    ]

    return {
        "document_id": document_id,
        "title": document.get("title") or document_id,
        "language": language,
        "languages": [language],
        "text_length": len(content),
        "truncated": False,
        "checked_char_count": len(content),
        "issues_count": len(issues),
        "issues": issues,
    }


def count_categories(documents: List[Dict[str, Any]]) -> Dict[str, int]:
    category_keys = {
        "spelling": "spelling_count",
        "grammar": "grammar_count",
        "style": "style_count",
        "typography": "typography_count",
        "punctuation": "punctuation_count",
    }
    counters = {
        "spelling_count": 0,
        "grammar_count": 0,
        "style_count": 0,
        "typography_count": 0,
        "punctuation_count": 0,
    }

    for document in documents:
        for issue in document["issues"]:
            key = category_keys.get(issue["category"])
            if key is not None:
                counters[key] += 1

    return counters


async def build_spelling_result(documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    async with get_spelling_analysis_semaphore():
        checked_at = datetime.now(timezone.utc).isoformat()
        checked_documents = [
            await run_in_threadpool(check_document, document)
            for document in documents
        ]
    category_counts = count_categories(checked_documents)
    languages = sorted(
        {
            language
            for document in checked_documents
            for language in document.get("languages", [])
        }
    )
    total_issues = sum(document["issues_count"] for document in checked_documents)

    return {
        "summary": {
            "documents_count": len(checked_documents),
            "total_issues": total_issues,
            **category_counts,
            "languages": languages,
            "checked_at": checked_at,
            "engine": ENGINE_NAME,
            "max_check_time_millis": MAX_CHECK_TIME_MILLIS,
        },
        "documents": checked_documents,
    }
