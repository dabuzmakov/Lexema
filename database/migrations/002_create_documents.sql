BEGIN;

CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES app_clients(id) ON DELETE CASCADE,
    client_document_id TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    char_count INTEGER NOT NULL DEFAULT 0,
    raw_word_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT documents_title_not_blank CHECK (LENGTH(BTRIM(title)) > 0),
    CONSTRAINT documents_content_not_blank CHECK (LENGTH(BTRIM(content)) > 0)
);

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS client_document_id TEXT;

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS char_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS raw_word_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE documents
SET
    char_count = LENGTH(content),
    raw_word_count = CASE
        WHEN BTRIM(content) = '' THEN 0
        ELSE COALESCE(ARRAY_LENGTH(REGEXP_SPLIT_TO_ARRAY(BTRIM(content), '\s+'), 1), 0)
    END,
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE char_count = 0
   OR raw_word_count = 0
   OR updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_client_document_id_unique
    ON documents (client_id, client_document_id)
    WHERE client_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_client_updated
    ON documents (client_id, updated_at DESC, id DESC);

COMMIT;
