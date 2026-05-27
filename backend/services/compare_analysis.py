import math
from typing import Any, Dict, List, Optional, Set, Tuple

from starlette.concurrency import run_in_threadpool

from schemas import AnalysisSettings
from services.analysis_runtime import get_compare_analysis_semaphore
from services.seo_analysis import build_seo_result_sync


MAX_COMPARISON_ROWS = 50
SIMILAR_DENSITY_EPSILON = 0.01


def round_number(value: float, digits: int = 2) -> float:
    return round(float(value), digits)


def get_number(value: Any, default: float = 0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def build_metric_diff(a_value: Any, b_value: Any) -> Dict[str, Any]:
    a_number = get_number(a_value)
    b_number = get_number(b_value)
    diff = a_number - b_number
    return {
        "a": normalize_metric_number(a_number),
        "b": normalize_metric_number(b_number),
        "diff": normalize_metric_number(diff),
        "diff_percent": round_number(diff / b_number * 100) if b_number != 0 else None,
    }


def normalize_metric_number(value: float) -> Any:
    if float(value).is_integer():
        return int(value)
    return round_number(value)


def calculate_jaccard_percent(set_a: Set[str], set_b: Set[str]) -> float:
    union = set_a | set_b
    if not union:
        return 0
    return round_number(len(set_a & set_b) / len(union) * 100)


def calculate_cosine_similarity_percent(freq_a: Dict[str, int], freq_b: Dict[str, int]) -> float:
    if not freq_a or not freq_b:
        return 0

    common_keys = set(freq_a) & set(freq_b)
    dot = sum(freq_a[key] * freq_b[key] for key in common_keys)
    norm_a = math.sqrt(sum(value * value for value in freq_a.values()))
    norm_b = math.sqrt(sum(value * value for value in freq_b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0
    return round_number(dot / (norm_a * norm_b) * 100)


def row_count(row: Dict[str, Any]) -> int:
    return int(get_number(row.get("count")))


def row_density(row: Dict[str, Any]) -> float:
    return get_number(row.get("density"))


def build_word_map(rows: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    return {str(row.get("word", "")): row for row in rows if row.get("word")}


def build_ngram_map(rows: List[Dict[str, Any]]) -> Dict[Tuple[str, int], Dict[str, Any]]:
    result: Dict[Tuple[str, int], Dict[str, Any]] = {}
    for row in rows:
        phrase = str(row.get("phrase", ""))
        size = int(get_number(row.get("size") or row.get("n")))
        if phrase and size:
            result[(phrase, size)] = row
    return result


def build_frequency_map(rows: List[Dict[str, Any]], key: str) -> Dict[str, int]:
    return {str(row[key]): row_count(row) for row in rows if row.get(key)}


def compare_rows(
    rows_a: List[Dict[str, Any]],
    rows_b: List[Dict[str, Any]],
    key: str,
    label_key: str,
) -> Dict[str, List[Dict[str, Any]]]:
    map_a = {str(row[key]): row for row in rows_a if row.get(key)}
    map_b = {str(row[key]): row for row in rows_b if row.get(key)}

    common = []
    for value in map_a.keys() & map_b.keys():
        row_a = map_a[value]
        row_b = map_b[value]
        common.append(
            {
                label_key: value,
                "a_count": row_count(row_a),
                "b_count": row_count(row_b),
                "a_density": row_density(row_a),
                "b_density": row_density(row_b),
                "diff_count": row_count(row_a) - row_count(row_b),
                "diff_density": round_number(row_density(row_a) - row_density(row_b)),
            }
        )

    only_a = [
        {label_key: value, "count": row_count(row), "density": row_density(row)}
        for value, row in map_a.items()
        if value not in map_b
    ]
    only_b = [
        {label_key: value, "count": row_count(row), "density": row_density(row)}
        for value, row in map_b.items()
        if value not in map_a
    ]

    common.sort(key=lambda item: max(item["a_count"], item["b_count"]), reverse=True)
    only_a.sort(key=lambda item: item["count"], reverse=True)
    only_b.sort(key=lambda item: item["count"], reverse=True)

    return {
        "common": common[:MAX_COMPARISON_ROWS],
        "only_a": only_a[:MAX_COMPARISON_ROWS],
        "only_b": only_b[:MAX_COMPARISON_ROWS],
    }


def compare_ngrams(rows_a: List[Dict[str, Any]], rows_b: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    map_a = build_ngram_map(rows_a)
    map_b = build_ngram_map(rows_b)

    common = []
    for key in map_a.keys() & map_b.keys():
        phrase, size = key
        row_a = map_a[key]
        row_b = map_b[key]
        common.append(
            {
                "phrase": phrase,
                "n": size,
                "a_count": row_count(row_a),
                "b_count": row_count(row_b),
                "a_density": row_density(row_a),
                "b_density": row_density(row_b),
                "diff_count": row_count(row_a) - row_count(row_b),
                "diff_density": round_number(row_density(row_a) - row_density(row_b)),
            }
        )

    only_a = [
        {"phrase": phrase, "n": size, "count": row_count(row), "density": row_density(row)}
        for (phrase, size), row in map_a.items()
        if (phrase, size) not in map_b
    ]
    only_b = [
        {"phrase": phrase, "n": size, "count": row_count(row), "density": row_density(row)}
        for (phrase, size), row in map_b.items()
        if (phrase, size) not in map_a
    ]

    common.sort(key=lambda item: max(item["a_count"], item["b_count"]), reverse=True)
    only_a.sort(key=lambda item: item["count"], reverse=True)
    only_b.sort(key=lambda item: item["count"], reverse=True)

    return {
        "common": common[:MAX_COMPARISON_ROWS],
        "only_a": only_a[:MAX_COMPARISON_ROWS],
        "only_b": only_b[:MAX_COMPARISON_ROWS],
    }


def keyword_status(count_a: int, density_a: float, count_b: int, density_b: float) -> str:
    if count_a == 0 and count_b > 0:
        return "missing_in_a"
    if count_b == 0 and count_a > 0:
        return "missing_in_b"
    if count_a == count_b and abs(density_a - density_b) <= SIMILAR_DENSITY_EPSILON:
        return "same"
    if count_a > count_b or density_a > density_b:
        return "higher_in_a"
    if count_b > count_a or density_b > density_a:
        return "lower_in_a"
    return "same"


def compare_keywords(rows_a: List[Dict[str, Any]], rows_b: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    map_a = {str(row.get("keyword", "")): row for row in rows_a if row.get("keyword")}
    map_b = {str(row.get("keyword", "")): row for row in rows_b if row.get("keyword")}
    keywords = list(dict.fromkeys([*map_a.keys(), *map_b.keys()]))

    result = []
    for keyword in keywords:
        row_a = map_a.get(keyword, {})
        row_b = map_b.get(keyword, {})
        count_a = row_count(row_a)
        count_b = row_count(row_b)
        density_a = row_density(row_a)
        density_b = row_density(row_b)
        result.append(
            {
                "keyword": keyword,
                "a": {"found": count_a > 0, "count": count_a, "density": density_a},
                "b": {"found": count_b > 0, "count": count_b, "density": density_b},
                "diff_count": count_a - count_b,
                "diff_density": round_number(density_a - density_b),
                "status": keyword_status(count_a, density_a, count_b, density_b),
            }
        )
    return result


def normalize_spam_risk(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"high", "высокий", "высокая"}:
        return "high"
    if normalized in {"medium", "средний", "средняя"}:
        return "medium"
    return "low"


def build_water_comparison(water_a: Dict[str, Any], water_b: Dict[str, Any]) -> Dict[str, Any]:
    percent_a = get_number(water_a.get("percent"))
    percent_b = get_number(water_b.get("percent"))
    units_a = int(get_number(water_a.get("water_units_count") or water_a.get("words_count")))
    units_b = int(get_number(water_b.get("water_units_count") or water_b.get("words_count")))
    return {
        "a": {
            "percent": percent_a,
            "words_count": units_a,
            "status": water_a.get("level") or water_a.get("status"),
        },
        "b": {
            "percent": percent_b,
            "words_count": units_b,
            "status": water_b.get("level") or water_b.get("status"),
        },
        "diff_percent": round_number(percent_a - percent_b),
        "words_count": build_metric_diff(units_a, units_b),
    }


def build_spam_comparison(analysis_a: Dict[str, Any], analysis_b: Dict[str, Any]) -> Dict[str, Any]:
    summary_a = analysis_a.get("summary", {})
    summary_b = analysis_b.get("summary", {})
    warnings_a = list(analysis_a.get("spam_warnings", []))
    warnings_b = list(analysis_b.get("spam_warnings", []))
    return {
        "a": {
            "risk": normalize_spam_risk(summary_a.get("spam_level")),
            "warnings_count": len(warnings_a),
            "warnings": warnings_a[:MAX_COMPARISON_ROWS],
        },
        "b": {
            "risk": normalize_spam_risk(summary_b.get("spam_level")),
            "warnings_count": len(warnings_b),
            "warnings": warnings_b[:MAX_COMPARISON_ROWS],
        },
        "diff_warnings": len(warnings_a) - len(warnings_b),
    }


def build_structure_comparison(
    structure_a: Optional[Dict[str, Any]],
    structure_b: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    if not structure_a or not structure_b:
        return None

    return {
        "paragraphs_count": build_metric_diff(structure_a.get("paragraphs_count"), structure_b.get("paragraphs_count")),
        "sentences_count": build_metric_diff(structure_a.get("sentences_count"), structure_b.get("sentences_count")),
        "avg_paragraph_length": build_metric_diff(
            structure_a.get("avg_words_per_paragraph"),
            structure_b.get("avg_words_per_paragraph"),
        ),
        "avg_sentence_length": build_metric_diff(
            structure_a.get("avg_words_per_sentence"),
            structure_b.get("avg_words_per_sentence"),
        ),
    }


def build_insights(
    summary: Dict[str, Any],
    keywords_comparison: List[Dict[str, Any]],
    water_comparison: Dict[str, Any],
) -> List[Dict[str, str]]:
    insights: List[Dict[str, str]] = []
    word_diff = int(get_number(summary.get("word_count_diff")))
    if word_diff < 0:
        insights.append(
            {
                "type": "info",
                "code": "A_SHORTER_THAN_B",
                "message": f"Текст A короче референса на {abs(word_diff)} слов.",
            }
        )
    elif word_diff > 0:
        insights.append(
            {
                "type": "info",
                "code": "A_LONGER_THAN_B",
                "message": f"Текст A длиннее референса на {word_diff} слов.",
            }
        )

    missing_in_a = [row for row in keywords_comparison if row["status"] == "missing_in_a"]
    if missing_in_a:
        insights.append(
            {
                "type": "warning",
                "code": "KEYWORDS_MISSING_IN_A",
                "message": f"В тексте A отсутствуют {len(missing_in_a)} ключевые фразы, которые есть в референсе.",
            }
        )

    water_diff = get_number(water_comparison.get("diff_percent"))
    if water_diff >= 5:
        insights.append(
            {
                "type": "warning",
                "code": "A_WATER_HIGHER",
                "message": f"В тексте A водность выше на {round_number(water_diff)}%.",
            }
        )
    elif water_diff <= -5:
        insights.append(
            {
                "type": "info",
                "code": "A_WATER_LOWER",
                "message": f"В тексте A водность ниже на {round_number(abs(water_diff))}%.",
            }
        )

    vocabulary_overlap = get_number(summary.get("vocabulary_overlap_percent"))
    if vocabulary_overlap < 40:
        insights.append(
            {
                "type": "info",
                "code": "LOW_VOCABULARY_OVERLAP",
                "message": "Словарное пересечение текстов ниже 40%.",
            }
        )

    return insights


def build_compare_result(
    document_a: Dict[str, Any],
    document_b: Dict[str, Any],
    analysis_a: Dict[str, Any],
    analysis_b: Dict[str, Any],
) -> Dict[str, Any]:
    summary_a = analysis_a.get("summary", {})
    summary_b = analysis_b.get("summary", {})
    structure_a = analysis_a.get("structure")
    structure_b = analysis_b.get("structure")
    water_comparison = build_water_comparison(analysis_a.get("water", {}), analysis_b.get("water", {}))
    spam_comparison = build_spam_comparison(analysis_a, analysis_b)
    structure_comparison = build_structure_comparison(structure_a, structure_b)

    words_a = list(analysis_a.get("words", []))
    words_b = list(analysis_b.get("words", []))
    ngrams_a = list(analysis_a.get("ngrams", []))
    ngrams_b = list(analysis_b.get("ngrams", []))
    word_freq_a = build_frequency_map(words_a, "word")
    word_freq_b = build_frequency_map(words_b, "word")
    ngram_keys_a = {" ".join([row["phrase"], str(row.get("size") or row.get("n"))]) for row in ngrams_a if row.get("phrase")}
    ngram_keys_b = {" ".join([row["phrase"], str(row.get("size") or row.get("n"))]) for row in ngrams_b if row.get("phrase")}

    vocabulary_overlap = calculate_jaccard_percent(set(word_freq_a), set(word_freq_b))
    ngram_overlap = calculate_jaccard_percent(ngram_keys_a, ngram_keys_b)
    cosine_similarity = calculate_cosine_similarity_percent(word_freq_a, word_freq_b)
    keywords_comparison = compare_keywords(list(analysis_a.get("keywords", [])), list(analysis_b.get("keywords", [])))

    metrics = {
        "char_count": build_metric_diff(document_a.get("char_count"), document_b.get("char_count")),
        "word_count": build_metric_diff(summary_a.get("total_words"), summary_b.get("total_words")),
        "unique_words": build_metric_diff(summary_a.get("unique_words"), summary_b.get("unique_words")),
        "water_percent": build_metric_diff(summary_a.get("water_percent"), summary_b.get("water_percent")),
        "spam_warnings_count": build_metric_diff(
            summary_a.get("spam_warnings_count"),
            summary_b.get("spam_warnings_count"),
        ),
        "paragraphs_count": build_metric_diff(
            (structure_a or {}).get("paragraphs_count"),
            (structure_b or {}).get("paragraphs_count"),
        ),
        "sentences_count": build_metric_diff(
            (structure_a or {}).get("sentences_count"),
            (structure_b or {}).get("sentences_count"),
        ),
        "avg_paragraph_length": build_metric_diff(
            (structure_a or {}).get("avg_words_per_paragraph"),
            (structure_b or {}).get("avg_words_per_paragraph"),
        ),
        "avg_sentence_length": build_metric_diff(
            (structure_a or {}).get("avg_words_per_sentence"),
            (structure_b or {}).get("avg_words_per_sentence"),
        ),
    }
    summary = {
        "word_count_diff": metrics["word_count"]["diff"],
        "word_count_diff_percent": metrics["word_count"]["diff_percent"],
        "unique_words_diff": metrics["unique_words"]["diff"],
        "water_diff": metrics["water_percent"]["diff"],
        "keyword_coverage_a": summary_a.get("keyword_coverage_percent", 0),
        "keyword_coverage_b": summary_b.get("keyword_coverage_percent", 0),
        "vocabulary_overlap_percent": vocabulary_overlap,
        "ngram_overlap_percent": ngram_overlap,
        "cosine_similarity_percent": cosine_similarity,
    }
    similarity = {
        "vocabulary_overlap_percent": vocabulary_overlap,
        "ngram_overlap_percent": ngram_overlap,
        "cosine_similarity_percent": cosine_similarity,
    }

    return {
        "documents": {
            "a": {
                "document_id": document_a["id"],
                "title": document_a["title"],
                "char_count": int(document_a.get("char_count") or 0),
                "word_count": int(summary_a.get("total_words") or document_a.get("raw_word_count") or 0),
            },
            "b": {
                "document_id": document_b["id"],
                "title": document_b["title"],
                "char_count": int(document_b.get("char_count") or 0),
                "word_count": int(summary_b.get("total_words") or document_b.get("raw_word_count") or 0),
            },
        },
        "summary": summary,
        "metrics": metrics,
        "keywords_comparison": keywords_comparison,
        "words_comparison": compare_rows(words_a, words_b, "word", "word"),
        "ngrams_comparison": compare_ngrams(ngrams_a, ngrams_b),
        "water_comparison": water_comparison,
        "spam_comparison": spam_comparison,
        "structure_comparison": structure_comparison,
        "similarity": similarity,
        "insights": build_insights(summary, keywords_comparison, water_comparison),
    }


def build_compare_analysis_result_sync(
    document_a: Dict[str, Any],
    document_b: Dict[str, Any],
    settings: AnalysisSettings,
) -> Dict[str, Any]:
    analysis_a = build_seo_result_sync([document_a], settings)
    analysis_b = build_seo_result_sync([document_b], settings)
    return build_compare_result(document_a, document_b, analysis_a, analysis_b)


async def build_compare_analysis_result(
    document_a: Dict[str, Any],
    document_b: Dict[str, Any],
    settings: AnalysisSettings,
) -> Dict[str, Any]:
    async with get_compare_analysis_semaphore():
        return await run_in_threadpool(
            build_compare_analysis_result_sync,
            document_a,
            document_b,
            settings,
        )
