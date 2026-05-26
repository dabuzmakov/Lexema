import asyncio
import importlib

import pytest
from fastapi import HTTPException


def test_config_parses_integer_env_and_cors(monkeypatch):
    import config

    monkeypatch.setenv("DB_POOL_MIN_SIZE", "20")
    monkeypatch.setenv("DB_POOL_MAX_SIZE", "5")
    monkeypatch.setenv("SEO_ANALYSIS_CONCURRENCY", "bad")
    monkeypatch.setenv("CORS_ALLOW_ORIGINS", " http://one.test/ , http://two.test ")

    reloaded = importlib.reload(config)

    assert reloaded.DB_POOL_MIN_SIZE == 5
    assert reloaded.DB_POOL_MAX_SIZE == 5
    assert reloaded.SEO_ANALYSIS_CONCURRENCY == 2
    assert reloaded.CORS_ALLOW_ORIGINS == ["http://one.test", "http://two.test"]


def test_database_lifespan_creates_and_closes_pool(monkeypatch):
    import database

    class FakePool:
        def __init__(self):
            self.closed = False

        async def close(self):
            self.closed = True

    fake_pool = FakePool()
    calls = []

    async def fake_create_pool(url, min_size, max_size):
        calls.append((url, min_size, max_size))
        return fake_pool

    monkeypatch.setattr(database, "DATABASE_URL", "postgresql://test")
    monkeypatch.setattr(database.asyncpg, "create_pool", fake_create_pool, raising=False)
    monkeypatch.setattr(database, "pool", None)

    async def run_lifespan():
        async with database.lifespan(None):
            assert database.require_pool() is fake_pool

    asyncio.run(run_lifespan())

    assert calls == [("postgresql://test", database.DB_POOL_MIN_SIZE, database.DB_POOL_MAX_SIZE)]
    assert fake_pool.closed is True


def test_require_pool_raises_when_database_is_not_configured(monkeypatch):
    import database

    monkeypatch.setattr(database, "pool", None)

    with pytest.raises(HTTPException) as exc_info:
        database.require_pool()

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Database is not configured"
