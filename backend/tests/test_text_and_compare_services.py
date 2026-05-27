from services.compare_analysis import (
    build_metric_diff,
    calculate_cosine_similarity_percent,
    calculate_jaccard_percent,
    compare_keywords,
    normalize_spam_risk,
)
from services.seo_analysis import has_mixed_alphabet, keyword_status, spam_level, water_level
from services.structure_analysis import analyze_text_structure, split_sentences
from services.text_utils import count_words, normalize_phrase, tokenize


def test_text_utils_cover_normalization_tokenization_and_counts():
    assert tokenize("Hello, мир-май") == ["hello", "мир-май"]
    assert normalize_phrase(" Hello,   WORLD ") == "hello world"
    assert count_words("one two") == 2


def test_seo_small_helpers_cover_status_levels():
    assert has_mixed_alphabet("pека") is True
    assert has_mixed_alphabet("река") is False
    assert keyword_status(0, 0, 3) == "missing"
    assert keyword_status(1, 5, 3) == "spam"
    assert keyword_status(1, 2.2, 3) == "high"
    assert keyword_status(1, 0.05, 3) == "low"
    assert keyword_status(1, 1, 3) == "normal"
    assert water_level(60) == "high"
    assert water_level(35) == "medium"
    assert water_level(10) == "low"
    assert spam_level(5) == "high"
    assert spam_level(1) == "medium"
    assert spam_level(0) == "low"


def test_compare_small_helpers_cover_similarity_and_keyword_statuses():
    assert calculate_jaccard_percent({"a"}, {"a", "b"}) == 50
    assert calculate_jaccard_percent(set(), set()) == 0
    assert calculate_cosine_similarity_percent({"a": 1}, {"a": 1}) == 100
    assert calculate_cosine_similarity_percent({}, {"a": 1}) == 0
    assert build_metric_diff(10, 5) == {"a": 10, "b": 5, "diff": 5, "diff_percent": 100.0}
    assert normalize_spam_risk("высокий") == "high"
    assert normalize_spam_risk("средняя") == "medium"
    assert normalize_spam_risk("anything") == "low"

    result = compare_keywords(
        [{"keyword": "a", "count": 2, "density": 2.0}, {"keyword": "b", "count": 0, "density": 0}],
        [{"keyword": "a", "count": 1, "density": 1.0}, {"keyword": "b", "count": 1, "density": 1.0}],
    )
    statuses = {row["keyword"]: row["status"] for row in result}

    assert statuses["a"] == "higher_in_a"
    assert statuses["b"] == "missing_in_a"


def test_structure_analysis_handles_empty_and_non_empty_text():
    empty = analyze_text_structure("")
    result = analyze_text_structure("One two.\nThree four five!")

    assert empty["words_count"] == 0
    assert split_sentences("One. Two? Three!") == ["One", "Two", "Three"]
    assert result["paragraphs_count"] == 2
    assert result["sentences_count"] == 2
