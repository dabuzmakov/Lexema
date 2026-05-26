import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def test_database_module_does_not_manage_schema():
    database_py = (REPO_ROOT / "backend" / "database.py").read_text(encoding="utf-8")

    forbidden_patterns = [
        r"\bensure_schema\b",
        r"\bCREATE\s+TABLE\b",
        r"\bALTER\s+TABLE\b",
        r"\bCREATE\s+INDEX\b",
        r"\bDROP\s+TABLE\b",
    ]
    for pattern in forbidden_patterns:
        assert not re.search(pattern, database_py, flags=re.IGNORECASE)


def test_sql_migrations_are_non_destructive_and_ordered():
    migration_files = sorted((REPO_ROOT / "database" / "migrations").glob("*.sql"))
    migration_names = [path.name for path in migration_files]

    assert migration_names == [
        "001_create_app_clients.sql",
        "002_create_documents.sql",
        "003_create_analysis_settings.sql",
        "004_create_analysis_results.sql",
        "005_add_analysis_lookup_indexes.sql",
    ]

    forbidden_patterns = [
        r"\bDROP\s+TABLE\b",
        r"\bTRUNCATE\b",
        r"\bDROP\s+COLUMN\b",
    ]
    for path in migration_files:
        sql = path.read_text(encoding="utf-8")
        for pattern in forbidden_patterns:
            assert not re.search(pattern, sql, flags=re.IGNORECASE), path.name


def test_apply_migrations_tracks_schema_migrations():
    script = (REPO_ROOT / "database" / "apply-migrations.sh").read_text(encoding="utf-8")

    assert "DATABASE_URL is required" in script
    assert "psql is not installed" in script
    assert "CREATE TABLE IF NOT EXISTS schema_migrations" in script
    assert "Skipping already applied migration" in script
    assert "INSERT INTO schema_migrations" in script
