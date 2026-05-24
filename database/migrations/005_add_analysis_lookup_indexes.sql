BEGIN;

CREATE INDEX IF NOT EXISTS idx_analysis_results_client_id
    ON analysis_results (client_id);

CREATE INDEX IF NOT EXISTS idx_analysis_results_analysis_type
    ON analysis_results (analysis_type);

COMMIT;
