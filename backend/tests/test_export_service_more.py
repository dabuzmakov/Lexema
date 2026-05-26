import pytest
from fastapi import HTTPException

from services.export import compare_table_to_csv, csv_response, seo_table_to_csv


def test_all_seo_export_tables_are_supported():
    result = {
        "ngrams": [{"phrase": "a b", "size": 2, "count": 3, "density": 30.0, "is_keyword": True}],
        "keywords": [{"keyword": "a", "type": "word", "count": 1, "density": 10.0, "status": "normal"}],
        "spam_warnings": [{"item": "a", "type": "word", "count": 5, "density": 50.0, "threshold": 3, "status": "spam"}],
        "water": {
            "percent": 10,
            "level": "low",
            "water_units_count": 2,
            "total_words": 20,
            "top_markers": [{"marker": "очень", "count": 2}],
        },
        "mixed_alphabet_words": [{"word": "pека", "count": 1, "suggestion": "река"}],
    }

    for table_type in ["ngrams", "keywords", "spam", "water", "mixed"]:
        headers, rows, filename = seo_table_to_csv(table_type, result)
        assert headers
        assert rows
        assert filename.startswith("seo_")


def test_all_compare_export_tables_are_supported():
    result = {
        "ngrams_comparison": {
            "common": [
                {
                    "phrase": "a b",
                    "n": 2,
                    "a_count": 2,
                    "b_count": 1,
                    "a_density": 20,
                    "b_density": 10,
                    "diff_count": 1,
                    "diff_density": 10,
                }
            ]
        },
        "keywords_comparison": [
            {
                "keyword": "a",
                "a": {"found": True, "count": 1, "density": 10},
                "b": {"found": False, "count": 0, "density": 0},
                "diff_count": 1,
                "diff_density": 10,
                "status": "missing_in_b",
            }
        ],
    }

    for table_type in ["ngrams", "keywords"]:
        headers, rows, filename = compare_table_to_csv(table_type, result)
        assert headers
        assert rows
        assert filename.startswith("compare_")


def test_export_unknown_types_raise_404():
    with pytest.raises(HTTPException) as seo_error:
        seo_table_to_csv("unknown", {})
    with pytest.raises(HTTPException) as compare_error:
        compare_table_to_csv("unknown", {})

    assert seo_error.value.status_code == 404
    assert compare_error.value.status_code == 404


def test_csv_response_sets_download_headers():
    response = csv_response(["a"], [[1]], "file.csv")

    assert response.media_type == "text/csv; charset=utf-8"
    assert response.headers["content-disposition"] == 'attachment; filename="file.csv"'
