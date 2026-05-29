import json
import re
from typing import Any, Dict, List, Optional

import asyncpg
from fastapi import HTTPException

from config import COMPARE_ANALYSIS_TYPE, DOCUMENT_ANALYSIS_TYPES, SEO_ANALYSIS_TYPE
from schemas import AnalysisSettings
from services.text_utils import count_words, normalize_text_unit


async def get_client_id(conn: asyncpg.Connection, browser_id: str) -> int:
    normalized = browser_id.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="browser_id is required")

    client_id = await conn.fetchval(
        """
        WITH inserted AS (
            INSERT INTO app_clients (browser_id, last_seen_at, updated_at)
            VALUES ($1, NOW(), NOW())
            ON CONFLICT (browser_id)
            DO NOTHING
            RETURNING id
        ),
        updated AS (
            UPDATE app_clients
            SET last_seen_at = NOW(), updated_at = NOW()
            WHERE browser_id = $1
              AND last_seen_at < NOW() - INTERVAL '1 minute'
              AND NOT EXISTS (SELECT 1 FROM inserted)
            RETURNING id
        )
        SELECT id FROM inserted
        UNION ALL
        SELECT id FROM updated
        UNION ALL
        SELECT id FROM app_clients
        WHERE browser_id = $1
          AND NOT EXISTS (SELECT 1 FROM inserted)
          AND NOT EXISTS (SELECT 1 FROM updated)
        LIMIT 1
        """,
        normalized,
    )
    return int(client_id)


def split_terms(raw_terms: List[str]) -> List[str]:
    values: List[str] = []
    for item in raw_terms:
        for part in re.split(r"[\n,;]+", item):
            normalized = normalize_text_unit(part)
            if normalized:
                values.append(normalized)
    return list(dict.fromkeys(values))


def settings_to_dict(row: Optional[asyncpg.Record]) -> Dict[str, Any]:
    if row is None:
        return AnalysisSettings().model_dump()
    return {
        "stop_words": {
            "mode": row["stop_words_mode"],
            "custom": list(row["custom_stop_words"] or []),
        },
        "keywords": list(row["keywords"] or []),
        "lemmatization": bool(row["lemmatization"]),
        "ngrams": {"sizes": list(row["ngram_sizes"] or [])},
        "spam": {"threshold_percent": float(row["spam_threshold_percent"])},
    }


async def get_settings_record(conn: asyncpg.Connection, client_id: int) -> asyncpg.Record:
    row = await conn.fetchrow(
        "SELECT * FROM analysis_settings WHERE client_id = $1",
        client_id,
    )
    if row is not None:
        return row

    return await conn.fetchrow(
        """
        INSERT INTO analysis_settings (client_id)
        VALUES ($1)
        RETURNING *
        """,
        client_id,
    )


async def save_settings_record(
    conn: asyncpg.Connection,
    client_id: int,
    settings: AnalysisSettings,
) -> Dict[str, Any]:
    custom_stop_words = split_terms(settings.stop_words.custom)
    keywords = split_terms(settings.keywords)
    ngram_sizes = sorted({size for size in settings.ngrams.sizes if size in {2, 3}})

    row = await conn.fetchrow(
        """
        INSERT INTO analysis_settings (
            client_id,
            stop_words_mode,
            custom_stop_words,
            keywords,
            lemmatization,
            ngram_sizes,
            spam_threshold_percent,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (client_id)
        DO UPDATE SET
            stop_words_mode = EXCLUDED.stop_words_mode,
            custom_stop_words = EXCLUDED.custom_stop_words,
            keywords = EXCLUDED.keywords,
            lemmatization = EXCLUDED.lemmatization,
            ngram_sizes = EXCLUDED.ngram_sizes,
            spam_threshold_percent = EXCLUDED.spam_threshold_percent,
            updated_at = NOW()
        RETURNING *
        """,
        client_id,
        settings.stop_words.mode,
        custom_stop_words,
        keywords,
        settings.lemmatization,
        ngram_sizes,
        settings.spam.threshold_percent,
    )
    await invalidate_analysis(
        conn,
        client_id,
        "Параметры анализа изменены",
        [SEO_ANALYSIS_TYPE, COMPARE_ANALYSIS_TYPE],
    )
    return settings_to_dict(row)


def document_to_dict(row: asyncpg.Record) -> Dict[str, Any]:
    client_document_id = row["client_document_id"] or str(row["id"])
    return {
        "id": str(client_document_id),
        "client_document_id": str(client_document_id),
        "database_id": int(row["id"]),
        "title": row["title"],
        "content": row["content"],
        "char_count": int(row["char_count"] or len(row["content"])),
        "raw_word_count": int(row["raw_word_count"] or count_words(row["content"])),
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


async def fetch_documents(conn: asyncpg.Connection, client_id: int) -> List[Dict[str, Any]]:
    rows = await conn.fetch(
        """
        SELECT id, client_document_id, title, content, char_count, raw_word_count, created_at, updated_at
        FROM documents
        WHERE client_id = $1
        ORDER BY updated_at DESC, id DESC
        """,
        client_id,
    )
    return [document_to_dict(row) for row in rows]


async def fetch_selected_documents(
    conn: asyncpg.Connection,
    client_id: int,
    document_ids: List[str],
) -> List[Dict[str, Any]]:
    if not document_ids:
        return await fetch_documents(conn, client_id)

    rows = await conn.fetch(
        """
        SELECT id, client_document_id, title, content, char_count, raw_word_count, created_at, updated_at
        FROM documents
        WHERE client_id = $1
          AND (client_document_id = ANY($2::text[]) OR id::text = ANY($2::text[]))
        ORDER BY updated_at DESC, id DESC
        """,
        client_id,
        document_ids,
    )
    return [document_to_dict(row) for row in rows]


async def invalidate_analysis(
    conn: asyncpg.Connection,
    client_id: int,
    reason: str,
    analysis_types: Optional[List[str]] = None,
) -> None:
    target_types = analysis_types or [SEO_ANALYSIS_TYPE]
    await conn.execute(
        """
        UPDATE analysis_results
        SET is_actual = FALSE,
            invalidation_reason = $3,
            updated_at = NOW()
        WHERE client_id = $1 AND analysis_type = ANY($2::text[])
        """,
        client_id,
        target_types,
        reason,
    )


async def invalidate_document_analysis(conn: asyncpg.Connection, client_id: int, reason: str) -> None:
    await invalidate_analysis(conn, client_id, reason, DOCUMENT_ANALYSIS_TYPES)


def parse_json_field(value: Any) -> Any:
    if isinstance(value, str):
        return json.loads(value)
    return value


async def get_latest_result(
    conn: asyncpg.Connection,
    client_id: int,
    analysis_type: str,
) -> Optional[Dict[str, Any]]:
    row = await conn.fetchrow(
        """
        SELECT analysis_type, selected_document_ids, params_snapshot, result,
               is_actual, invalidation_reason, created_at, updated_at
        FROM analysis_results
        WHERE client_id = $1 AND analysis_type = $2
        """,
        client_id,
        analysis_type,
    )
    if row is None:
        return None

    return {
        "analysis_type": row["analysis_type"],
        "selected_document_ids": parse_json_field(row["selected_document_ids"]),
        "params_snapshot": parse_json_field(row["params_snapshot"]),
        "result": parse_json_field(row["result"]),
        "is_actual": bool(row["is_actual"]),
        "invalidation_reason": row["invalidation_reason"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


async def get_latest_results(
    conn: asyncpg.Connection,
    client_id: int,
    analysis_types: List[str],
) -> Dict[str, Optional[Dict[str, Any]]]:
    rows = await conn.fetch(
        """
        SELECT analysis_type, selected_document_ids, params_snapshot, result,
               is_actual, invalidation_reason, created_at, updated_at
        FROM analysis_results
        WHERE client_id = $1 AND analysis_type = ANY($2::text[])
        """,
        client_id,
        analysis_types,
    )
    results = {
        row["analysis_type"]: {
            "analysis_type": row["analysis_type"],
            "selected_document_ids": parse_json_field(row["selected_document_ids"]),
            "params_snapshot": parse_json_field(row["params_snapshot"]),
            "result": parse_json_field(row["result"]),
            "is_actual": bool(row["is_actual"]),
            "invalidation_reason": row["invalidation_reason"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        }
        for row in rows
    }
    return {analysis_type: results.get(analysis_type) for analysis_type in analysis_types}


async def save_analysis_result(
    conn: asyncpg.Connection,
    client_id: int,
    analysis_type: str,
    selected_document_ids: List[str],
    params_snapshot: Dict[str, Any],
    result: Dict[str, Any],
) -> Dict[str, Any]:
    row = await conn.fetchrow(
        """
        INSERT INTO analysis_results (
            client_id,
            analysis_type,
            selected_document_ids,
            params_snapshot,
            result,
            is_actual,
            invalidation_reason,
            updated_at
        )
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, TRUE, NULL, NOW())
        ON CONFLICT (client_id, analysis_type)
        DO UPDATE SET
            selected_document_ids = EXCLUDED.selected_document_ids,
            params_snapshot = EXCLUDED.params_snapshot,
            result = EXCLUDED.result,
            is_actual = TRUE,
            invalidation_reason = NULL,
            updated_at = NOW()
        RETURNING analysis_type, selected_document_ids, params_snapshot, result,
                  is_actual, invalidation_reason, created_at, updated_at
        """,
        client_id,
        analysis_type,
        json.dumps(selected_document_ids, ensure_ascii=False),
        json.dumps(params_snapshot, ensure_ascii=False),
        json.dumps(result, ensure_ascii=False),
    )
    return {
        "analysis_type": row["analysis_type"],
        "selected_document_ids": parse_json_field(row["selected_document_ids"]),
        "params_snapshot": parse_json_field(row["params_snapshot"]),
        "result": parse_json_field(row["result"]),
        "is_actual": bool(row["is_actual"]),
        "invalidation_reason": row["invalidation_reason"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


async def get_saved_seo_or_404(conn: asyncpg.Connection, client_id: int) -> Dict[str, Any]:
    latest = await get_latest_result(conn, client_id, SEO_ANALYSIS_TYPE)
    if latest is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "SEO-анализ ещё не выполнен"},
        )
    return latest["result"]


async def get_saved_compare_or_404(conn: asyncpg.Connection, client_id: int) -> Dict[str, Any]:
    latest = await get_latest_result(conn, client_id, COMPARE_ANALYSIS_TYPE)
    if latest is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "Сравнительный анализ ещё не выполнен"},
        )
    return latest["result"]
