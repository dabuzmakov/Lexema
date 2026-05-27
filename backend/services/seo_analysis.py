from __future__ import annotations

import re
from collections import Counter
from typing import Any, Dict, List, Set

from starlette.concurrency import run_in_threadpool

from constants import MIXED_LAYOUT_MAP
from repositories import split_terms
from services.dictionaries import get_ru_stop_words, get_ru_water_dictionary
from services.analysis_runtime import get_seo_analysis_semaphore
from schemas import AnalysisSettings
from services.structure_analysis import analyze_text_structure, build_structure_charts
from services.text_utils import normalize_phrase, normalize_text_unit, tokenize


def make_ngrams(words: List[str], sizes: List[int]) -> Counter:
    counter: Counter = Counter()
    for size in sizes:
        if size < 2:
            continue
        for index in range(0, max(0, len(words) - size + 1)):
            phrase = " ".join(words[index : index + size])
            counter[(phrase, size)] += 1
    return counter


def has_mixed_alphabet(word: str) -> bool:
    return bool(re.search(r"[A-Za-z]", word)) and bool(re.search(r"[А-Яа-яЁё]", word))


def keyword_status(count: int, density: float, threshold_percent: float) -> str:
    if count == 0:
        return "missing"
    if density >= threshold_percent:
        return "spam"
    if density >= threshold_percent * 0.7:
        return "high"
    if density < 0.1:
        return "low"
    return "normal"


def water_level(percent: float) -> str:
    if percent >= 55:
        return "high"
    if percent >= 30:
        return "medium"
    return "low"


def spam_level(warnings_count: int) -> str:
    if warnings_count >= 5:
        return "high"
    if warnings_count > 0:
        return "medium"
    return "low"


def build_chart_rows(rows: List[Dict[str, Any]], label_key: str) -> List[Dict[str, Any]]:
    return [{"label": row[label_key], "value": row["count"]} for row in rows[:12]]


def count_water_markers(tokens: List[str], normalized_text: str, water_words: Set[str], water_phrases: Set[str]) -> Counter:
    counter: Counter[str] = Counter()
    covered_indexes: Set[int] = set()
    normalized_tokens = normalized_text.split()
    phrase_markers = sorted((phrase.split() for phrase in water_phrases), key=len, reverse=True)

    for phrase_parts in phrase_markers:
        phrase_length = len(phrase_parts)
        if phrase_length == 0 or phrase_length > len(normalized_tokens):
            continue

        for start in range(0, len(normalized_tokens) - phrase_length + 1):
            indexes = set(range(start, start + phrase_length))
            if indexes & covered_indexes:
                continue
            if normalized_tokens[start : start + phrase_length] == phrase_parts:
                counter[" ".join(phrase_parts)] += 1
                covered_indexes.update(indexes)

    for index, token in enumerate(tokens):
        if index not in covered_indexes and token in water_words:
            counter[token] += 1

    return counter


def build_seo_result_sync(
    documents: List[Dict[str, Any]],
    settings: AnalysisSettings,
) -> Dict[str, Any]:
    lemmatize = settings.lemmatization
    default_stop_words = {
        normalize_phrase(word, lemmatize=lemmatize)
        for word in get_ru_stop_words()
    }
    water_dictionary = get_ru_water_dictionary()
    water_words = {normalize_phrase(word, lemmatize=lemmatize) for word in water_dictionary["words"]}
    water_phrases = {normalize_phrase(phrase) for phrase in water_dictionary["phrases"]}
    custom_stop_words = {normalize_phrase(word, lemmatize=lemmatize) for word in split_terms(settings.stop_words.custom)}

    if settings.stop_words.mode == "off":
        stop_words: Set[str] = set()
    elif settings.stop_words.mode == "custom":
        stop_words = custom_stop_words
    elif settings.stop_words.mode == "default_custom":
        stop_words = default_stop_words | custom_stop_words
    else:
        stop_words = default_stop_words

    keyword_terms = [normalize_phrase(term, lemmatize=lemmatize) for term in split_terms(settings.keywords)]
    keyword_words = {term for term in keyword_terms if len(term.split()) == 1}
    keyword_phrases = {term for term in keyword_terms if len(term.split()) > 1}
    ngram_sizes = sorted({size for size in settings.ngrams.sizes if size in {2, 3}})

    raw_tokens: List[str] = []
    original_tokens: List[str] = []
    combined_text = "\n".join(document["content"] for document in documents)
    normalized_combined_text = normalize_phrase(combined_text)
    structure = analyze_text_structure(combined_text)
    for document in documents:
        raw_tokens.extend(tokenize(document["content"], lemmatize=lemmatize))
        original_tokens.extend(tokenize(document["content"], normalize=False))

    filtered_tokens = [word for word in raw_tokens if word and word not in stop_words]
    total_words = len(raw_tokens)
    filtered_total = max(1, len(filtered_tokens))

    word_counter = Counter(filtered_tokens)
    raw_word_counter = Counter(raw_tokens)
    ngram_counter = make_ngrams(filtered_tokens, ngram_sizes)
    raw_ngram_counter = make_ngrams(raw_tokens, [2, 3])

    words = [
        {
            "word": word,
            "count": count,
            "density": round(count / filtered_total * 100, 2),
            "length": len(word),
            "is_keyword": word in keyword_words,
        }
        for word, count in word_counter.most_common()
    ]

    total_ngram_units = max(1, sum(ngram_counter.values()))
    ngrams = [
        {
            "phrase": phrase,
            "size": size,
            "count": count,
            "density": round(count / total_ngram_units * 100, 2),
            "is_keyword": phrase in keyword_phrases,
        }
        for (phrase, size), count in ngram_counter.most_common()
    ]

    keywords = []
    for keyword in keyword_terms:
        parts = keyword.split()
        if len(parts) == 1:
            count = raw_word_counter[keyword]
            unit_type = "word"
        else:
            count = raw_ngram_counter[(keyword, len(parts))]
            unit_type = "ngram"
        density = round(count / max(1, total_words) * 100, 2)
        keywords.append(
            {
                "keyword": keyword,
                "type": unit_type,
                "count": count,
                "density": density,
                "status": keyword_status(count, density, settings.spam.threshold_percent),
            }
        )

    spam_warnings = []
    for row in words:
        if row["density"] >= settings.spam.threshold_percent:
            spam_warnings.append(
                {
                    "item": row["word"],
                    "type": "word",
                    "count": row["count"],
                    "density": row["density"],
                    "threshold": settings.spam.threshold_percent,
                    "status": "spam" if row["density"] >= settings.spam.threshold_percent * 1.5 else "high",
                }
            )
    for row in ngrams:
        if row["density"] >= settings.spam.threshold_percent:
            spam_warnings.append(
                {
                    "item": row["phrase"],
                    "type": "ngram",
                    "count": row["count"],
                    "density": row["density"],
                    "threshold": settings.spam.threshold_percent,
                    "status": "spam" if row["density"] >= settings.spam.threshold_percent * 1.5 else "high",
                }
            )

    water_marker_counter = count_water_markers(raw_tokens, normalized_combined_text, water_words, water_phrases)
    water_units_count = sum(water_marker_counter.values())

    water_percent = round(water_units_count / max(1, total_words) * 100, 2)
    water = {
        "percent": water_percent,
        "level": water_level(water_percent),
        "water_units_count": water_units_count,
        "total_words": total_words,
        "markers": [
            {"marker": marker, "count": count}
            for marker, count in water_marker_counter.most_common()
        ],
        "top_markers": [
            {"marker": marker, "count": count}
            for marker, count in water_marker_counter.most_common(10)
        ],
    }

    mixed_counter = Counter(
        normalize_text_unit(word) for word in original_tokens if has_mixed_alphabet(word)
    )
    mixed_alphabet_words = [
        {
            "word": word,
            "count": count,
            "suggestion": word.translate(MIXED_LAYOUT_MAP),
        }
        for word, count in mixed_counter.most_common()
    ]

    recommendations = []
    for row in keywords:
        if row["status"] == "missing":
            recommendations.append(f"Ключ «{row['keyword']}» отсутствует в выбранных документах.")
        elif row["status"] in {"high", "spam"}:
            recommendations.append(
                f"Снизьте плотность ключа «{row['keyword']}»: сейчас {row['density']}%."
            )
    for warning in spam_warnings[:5]:
        recommendations.append(
            f"Единица «{warning['item']}» превышает порог переспама {warning['threshold']}%."
        )
    if water_percent >= 55:
        recommendations.append("Снизьте водность: уберите вводные конструкции и слабые служебные слова.")
    if mixed_alphabet_words:
        recommendations.append("Исправьте слова со смешанной кириллицей и латиницей.")
    if not recommendations:
        recommendations.append("Критичных SEO-проблем не найдено. Проверьте ключи и структуру перед публикацией.")

    keywords_found = sum(1 for row in keywords if row["count"] > 0)
    summary = {
        "documents_count": len(documents),
        "total_words": total_words,
        "unique_words": len(set(raw_tokens)),
        "keywords_total": len(keyword_terms),
        "keywords_found": keywords_found,
        "keywords_missing": max(0, len(keyword_terms) - keywords_found),
        "spam_warnings_count": len(spam_warnings),
        "water_percent": water_percent,
        "mixed_alphabet_count": len(mixed_alphabet_words),
        "spam_level": spam_level(len(spam_warnings)),
        "keyword_coverage_percent": round(keywords_found / max(1, len(keyword_terms)) * 100, 2)
        if keyword_terms
        else 0,
    }

    return {
        "summary": summary,
        "words": words,
        "ngrams": ngrams,
        "keywords": keywords,
        "spam_warnings": spam_warnings,
        "water": water,
        "mixed_alphabet_words": mixed_alphabet_words,
        "structure": structure,
        "recommendations": recommendations,
        "lexicon": {
            "stop_words": sorted(stop_words),
            "water_markers": sorted(water_words | water_phrases),
        },
        "charts": {
            "top_words": build_chart_rows(words, "word"),
            "top_ngrams": build_chart_rows(ngrams, "phrase"),
            "keyword_coverage": {"found": keywords_found, "total": len(keyword_terms)},
            "water": {"percent": water_percent, "level": water["level"]},
            "spam": {"count": len(spam_warnings), "level": spam_level(len(spam_warnings))},
            "structure": build_structure_charts(structure),
        },
    }


async def build_seo_result(
    documents: List[Dict[str, Any]],
    settings: AnalysisSettings,
) -> Dict[str, Any]:
    async with get_seo_analysis_semaphore():
        return await run_in_threadpool(build_seo_result_sync, documents, settings)
