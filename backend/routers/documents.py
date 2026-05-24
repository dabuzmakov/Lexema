import uuid

from fastapi import APIRouter, HTTPException, Query

from config import MAX_DOCUMENTS
from database import require_pool
from repositories import (
    document_to_dict,
    fetch_documents,
    get_client_id,
    invalidate_document_analysis,
)
from routers.common import validate_content_size
from schemas import DocumentCreateRequest, DocumentPatchRequest
from services.text_utils import count_words


router = APIRouter()


@router.get("/documents")
async def get_documents(browser_id: str = Query(..., min_length=1)):
    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, browser_id)
        return {"status": "success", "data": await fetch_documents(conn, client_id)}


@router.post("/documents")
async def create_document(request_data: DocumentCreateRequest):
    validate_content_size(request_data.content)
    char_count = len(request_data.content)
    raw_word_count = count_words(request_data.content)

    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, request_data.browser_id)
        existing_count = await conn.fetchval(
            "SELECT COUNT(*) FROM documents WHERE client_id = $1",
            client_id,
        )
        if int(existing_count) >= MAX_DOCUMENTS:
            raise HTTPException(status_code=400, detail="DOCUMENT_LIMIT_REACHED")

        client_document_id = request_data.client_document_id or str(uuid.uuid4())
        row = await conn.fetchrow(
            """
            INSERT INTO documents (
                client_id,
                client_document_id,
                title,
                content,
                char_count,
                raw_word_count,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id, client_document_id, title, content, char_count, raw_word_count, created_at, updated_at
            """,
            client_id,
            client_document_id,
            request_data.title,
            request_data.content,
            char_count,
            raw_word_count,
        )
        await invalidate_document_analysis(conn, client_id, "Документы изменены")
        return {"status": "success", "data": document_to_dict(row)}


@router.patch("/documents/{document_id}")
async def update_document(document_id: str, request_data: DocumentPatchRequest):
    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, request_data.browser_id)
        existing = await conn.fetchrow(
            """
            SELECT id, title, content
            FROM documents
            WHERE client_id = $1 AND (client_document_id = $2 OR id::text = $2)
            """,
            client_id,
            document_id,
        )
        if existing is None:
            raise HTTPException(status_code=404, detail="DOCUMENT_NOT_FOUND")

    title = request_data.title if request_data.title is not None else existing["title"]
    content = request_data.content if request_data.content is not None else existing["content"]
    validate_content_size(content)
    char_count = len(content)
    raw_word_count = count_words(content)

    async with require_pool().acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE documents
            SET title = $3,
                content = $4,
                char_count = $5,
                raw_word_count = $6,
                updated_at = NOW()
            WHERE client_id = $1 AND id = $2
            RETURNING id, client_document_id, title, content, char_count, raw_word_count, created_at, updated_at
            """,
            client_id,
            existing["id"],
            title,
            content,
            char_count,
            raw_word_count,
        )
        await invalidate_document_analysis(conn, client_id, "Документы изменены")
        return {"status": "success", "data": document_to_dict(row)}


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, browser_id: str = Query(..., min_length=1)):
    async with require_pool().acquire() as conn:
        client_id = await get_client_id(conn, browser_id)
        result = await conn.execute(
            """
            DELETE FROM documents
            WHERE client_id = $1 AND (client_document_id = $2 OR id::text = $2)
            """,
            client_id,
            document_id,
        )
        deleted_count = int(result.split()[-1])
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="DOCUMENT_NOT_FOUND")
        await invalidate_document_analysis(conn, client_id, "Документы изменены")
        return {
            "status": "success",
            "data": {"message": "Document deleted"},
            "message": "Document deleted",
        }
