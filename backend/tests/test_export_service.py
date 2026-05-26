from services.export import compare_table_to_csv, csv_bytes, seo_table_to_csv


def test_seo_words_csv_uses_saved_result_shape():
    result = {
        "words": [
            {"word": "текст", "count": 2, "density": 10.0, "length": 5, "is_keyword": False}
        ]
    }

    headers, rows, filename = seo_table_to_csv("words", result)

    assert filename == "seo_words.csv"
    assert rows[0][:4] == ["текст", 2, 10.0, 5]
    assert csv_bytes(headers, rows).startswith(b"\xef\xbb\xbf")


def test_compare_words_csv_uses_saved_result_shape():
    result = {
        "words_comparison": {
            "common": [
                {
                    "word": "термин",
                    "a_count": 2,
                    "b_count": 1,
                    "a_density": 20.0,
                    "b_density": 10.0,
                    "diff_count": 1,
                    "diff_density": 10.0,
                }
            ]
        }
    }

    headers, rows, filename = compare_table_to_csv("words", result)

    assert filename == "compare_words.csv"
    assert headers[0]
    assert rows[0][0] == "термин"
