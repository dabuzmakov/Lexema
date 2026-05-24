import os
from typing import List, Optional

from dotenv import load_dotenv


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def parse_int_env(name: str, default: int, min_value: int = 0) -> int:
    raw_value = os.getenv(name)
    if raw_value is None or not raw_value.strip():
        return default
    try:
        value = int(raw_value)
    except ValueError:
        return default
    return max(min_value, value)


DB_POOL_MIN_SIZE = parse_int_env("DB_POOL_MIN_SIZE", 1, min_value=0)
DB_POOL_MAX_SIZE = parse_int_env("DB_POOL_MAX_SIZE", 8, min_value=1)
if DB_POOL_MIN_SIZE > DB_POOL_MAX_SIZE:
    DB_POOL_MIN_SIZE = DB_POOL_MAX_SIZE

SEO_ANALYSIS_CONCURRENCY = parse_int_env("SEO_ANALYSIS_CONCURRENCY", 2, min_value=1)
SPELLING_ANALYSIS_CONCURRENCY = parse_int_env("SPELLING_ANALYSIS_CONCURRENCY", 1, min_value=1)
COMPARE_ANALYSIS_CONCURRENCY = parse_int_env("COMPARE_ANALYSIS_CONCURRENCY", 1, min_value=1)

MAX_DOCUMENTS_PER_CLIENT = parse_int_env("MAX_DOCUMENTS_PER_CLIENT", 30, min_value=1)
MAX_DOCUMENT_CHARS = parse_int_env("MAX_DOCUMENT_CHARS", 150_000, min_value=1)
MAX_TOTAL_CHARS_PER_SEO_ANALYSIS = parse_int_env("MAX_TOTAL_CHARS_PER_SEO_ANALYSIS", 300_000, min_value=1)
MAX_TOTAL_CHARS_PER_SPELLING_ANALYSIS = parse_int_env("MAX_TOTAL_CHARS_PER_SPELLING_ANALYSIS", 100_000, min_value=1)
MAX_DOCUMENT_CHARS_PER_COMPARE = parse_int_env("MAX_DOCUMENT_CHARS_PER_COMPARE", 150_000, min_value=1)

MAX_DOCUMENTS = MAX_DOCUMENTS_PER_CLIENT
SEO_ANALYSIS_TYPE = "seo"
SPELLING_ANALYSIS_TYPE = "spelling"
COMPARE_ANALYSIS_TYPE = "compare"
DOCUMENT_ANALYSIS_TYPES = [SEO_ANALYSIS_TYPE, SPELLING_ANALYSIS_TYPE, COMPARE_ANALYSIS_TYPE]

DEFAULT_CORS_ALLOW_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "https://text-analyzer-frontend-ra8y.onrender.com",
]


def parse_cors_origins(value: Optional[str]) -> List[str]:
    if not value:
        return DEFAULT_CORS_ALLOW_ORIGINS

    origins = [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
    return origins or DEFAULT_CORS_ALLOW_ORIGINS


CORS_ALLOW_ORIGINS = parse_cors_origins(os.getenv("CORS_ALLOW_ORIGINS"))
