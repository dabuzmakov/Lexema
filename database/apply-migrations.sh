#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$REPO_ROOT/database/migrations}"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

echo "Preparing schema_migrations table..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);"

shopt -s nullglob
migration_files=("$MIGRATIONS_DIR"/*.sql)

if (( ${#migration_files[@]} == 0 )); then
  echo "No migration files found in $MIGRATIONS_DIR"
  exit 0
fi

for file in "${migration_files[@]}"; do
  filename="$(basename "$file")"

  already_applied="$(
    psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -v filename="$filename" <<'SQL'
SELECT 1 FROM schema_migrations WHERE filename = :'filename' LIMIT 1;
SQL
  )"
  if [[ "$already_applied" == "1" ]]; then
    echo "Skipping already applied migration: $filename"
    continue
  fi

  echo "Applying migration: $filename"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v filename="$filename" <<'SQL'
INSERT INTO schema_migrations (filename) VALUES (:'filename');
SQL
done

echo "Migration process completed."
