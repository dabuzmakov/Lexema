BEGIN;

CREATE TABLE IF NOT EXISTS analysis_results (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL REFERENCES app_clients(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL,
    selected_document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    params_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_actual BOOLEAN NOT NULL DEFAULT TRUE,
    invalidation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, analysis_type)
);

ALTER TABLE analysis_results
    ADD COLUMN IF NOT EXISTS analysis_type TEXT NOT NULL DEFAULT 'seo';

ALTER TABLE analysis_results
    ADD COLUMN IF NOT EXISTS selected_document_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE analysis_results
    ADD COLUMN IF NOT EXISTS params_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE analysis_results
    ADD COLUMN IF NOT EXISTS result JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE analysis_results
    ADD COLUMN IF NOT EXISTS is_actual BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE analysis_results
    ADD COLUMN IF NOT EXISTS invalidation_reason TEXT;

ALTER TABLE analysis_results
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE analysis_results
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMIT;
