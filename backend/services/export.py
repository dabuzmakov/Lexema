import csv
import io
from typing import Any, Dict, List, Tuple

from fastapi import HTTPException
from fastapi.responses import StreamingResponse


def csv_bytes(headers: List[str], rows: List[List[Any]]) -> bytes:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    return output.getvalue().encode("utf-8-sig")


def csv_response(headers: List[str], rows: List[List[Any]], filename: str) -> StreamingResponse:
    payload = csv_bytes(headers, rows)
    return StreamingResponse(
        io.BytesIO(payload),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def seo_table_to_csv(table_type: str, result: Dict[str, Any]) -> Tuple[List[str], List[List[Any]], str]:
    if table_type == "words":
        return (
            ["Слово", "Частота", "Плотность", "Длина", "Ключ"],
            [
                [row["word"], row["count"], row["density"], row["length"], "да" if row["is_keyword"] else "нет"]
                for row in result.get("words", [])
            ],
            "seo_words.csv",
        )
    if table_type == "ngrams":
        return (
            ["Фраза", "Размер", "Частота", "Плотность", "Ключ"],
            [
                [row["phrase"], row["size"], row["count"], row["density"], "да" if row["is_keyword"] else "нет"]
                for row in result.get("ngrams", [])
            ],
            "seo_ngrams.csv",
        )
    if table_type == "keywords":
        return (
            ["Ключ", "Тип", "Частота", "Плотность", "Статус"],
            [
                [row["keyword"], row["type"], row["count"], row["density"], row["status"]]
                for row in result.get("keywords", [])
            ],
            "seo_keywords.csv",
        )
    if table_type == "spam":
        return (
            ["Единица", "Тип", "Частота", "Плотность", "Порог", "Статус"],
            [
                [row["item"], row["type"], row["count"], row["density"], row["threshold"], row["status"]]
                for row in result.get("spam_warnings", [])
            ],
            "seo_spam.csv",
        )
    if table_type == "water":
        water = result.get("water", {})
        rows = [
            ["percent", water.get("percent", 0)],
            ["level", water.get("level", "")],
            ["water_units_count", water.get("water_units_count", 0)],
            ["total_words", water.get("total_words", 0)],
        ]
        rows.extend(
            [f"marker:{marker['marker']}", marker["count"]]
            for marker in water.get("top_markers", [])
        )
        return ["Показатель", "Значение"], rows, "seo_water.csv"
    if table_type == "mixed":
        return (
            ["Слово", "Частота", "Предложение"],
            [
                [row["word"], row["count"], row["suggestion"]]
                for row in result.get("mixed_alphabet_words", [])
            ],
            "seo_mixed.csv",
        )
    raise HTTPException(status_code=404, detail="Unknown SEO export type")


def compare_table_to_csv(table_type: str, result: Dict[str, Any]) -> Tuple[List[str], List[List[Any]], str]:
    if table_type == "words":
        rows = result.get("words_comparison", {}).get("common", [])
        return (
            ["Слово", "A частота", "B частота", "A плотность", "B плотность", "Разница частоты", "Разница плотности"],
            [
                [
                    row.get("word", ""),
                    row.get("a_count", 0),
                    row.get("b_count", 0),
                    row.get("a_density", 0),
                    row.get("b_density", 0),
                    row.get("diff_count", 0),
                    row.get("diff_density", 0),
                ]
                for row in rows
            ],
            "compare_words.csv",
        )
    if table_type == "ngrams":
        rows = result.get("ngrams_comparison", {}).get("common", [])
        return (
            ["Фраза", "N", "A частота", "B частота", "A плотность", "B плотность", "Разница частоты", "Разница плотности"],
            [
                [
                    row.get("phrase", ""),
                    row.get("n", ""),
                    row.get("a_count", 0),
                    row.get("b_count", 0),
                    row.get("a_density", 0),
                    row.get("b_density", 0),
                    row.get("diff_count", 0),
                    row.get("diff_density", 0),
                ]
                for row in rows
            ],
            "compare_ngrams.csv",
        )
    if table_type == "keywords":
        return (
            ["Ключ", "A найден", "A частота", "A плотность", "B найден", "B частота", "B плотность", "Разница частоты", "Разница плотности", "Статус"],
            [
                [
                    row.get("keyword", ""),
                    "да" if row.get("a", {}).get("found") else "нет",
                    row.get("a", {}).get("count", 0),
                    row.get("a", {}).get("density", 0),
                    "да" if row.get("b", {}).get("found") else "нет",
                    row.get("b", {}).get("count", 0),
                    row.get("b", {}).get("density", 0),
                    row.get("diff_count", 0),
                    row.get("diff_density", 0),
                    row.get("status", ""),
                ]
                for row in result.get("keywords_comparison", [])
            ],
            "compare_keywords.csv",
        )
    raise HTTPException(status_code=404, detail="Unknown compare export type")
