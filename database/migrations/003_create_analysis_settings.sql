BEGIN;

CREATE TABLE IF NOT EXISTS analysis_settings (
    id BIGSERIAL PRIMARY KEY,
    client_id BIGINT NOT NULL UNIQUE REFERENCES app_clients(id) ON DELETE CASCADE,
    stop_words_mode TEXT NOT NULL DEFAULT 'default',
    custom_stop_words TEXT[] NOT NULL DEFAULT '{}',
    keywords TEXT[] NOT NULL DEFAULT '{}',
    lemmatization BOOLEAN NOT NULL DEFAULT TRUE,
    ngram_sizes INTEGER[] NOT NULL DEFAULT '{2,3}',
    spam_threshold_percent NUMERIC NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE analysis_settings
    ADD COLUMN IF NOT EXISTS stop_words_mode TEXT NOT NULL DEFAULT 'default';

ALTER TABLE analysis_settings
    ADD COLUMN IF NOT EXISTS custom_stop_words TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE analysis_settings
    ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE analysis_settings
    ADD COLUMN IF NOT EXISTS lemmatization BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE analysis_settings
    ADD COLUMN IF NOT EXISTS ngram_sizes INTEGER[] NOT NULL DEFAULT '{2,3}';

ALTER TABLE analysis_settings
    ADD COLUMN IF NOT EXISTS spam_threshold_percent NUMERIC NOT NULL DEFAULT 3;

ALTER TABLE analysis_settings
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE analysis_settings
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMIT;
