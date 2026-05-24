import asyncio
from typing import Dict, Tuple

from config import (
    COMPARE_ANALYSIS_CONCURRENCY,
    SEO_ANALYSIS_CONCURRENCY,
    SPELLING_ANALYSIS_CONCURRENCY,
)


_semaphores: Dict[Tuple[str, int], asyncio.Semaphore] = {}


def get_analysis_semaphore(name: str, limit: int) -> asyncio.Semaphore:
    loop_id = id(asyncio.get_running_loop())
    key = (name, loop_id)
    semaphore = _semaphores.get(key)
    if semaphore is None:
        semaphore = asyncio.Semaphore(limit)
        _semaphores[key] = semaphore
    return semaphore


def get_seo_analysis_semaphore() -> asyncio.Semaphore:
    return get_analysis_semaphore("seo", SEO_ANALYSIS_CONCURRENCY)


def get_spelling_analysis_semaphore() -> asyncio.Semaphore:
    return get_analysis_semaphore("spelling", SPELLING_ANALYSIS_CONCURRENCY)


def get_compare_analysis_semaphore() -> asyncio.Semaphore:
    return get_analysis_semaphore("compare", COMPARE_ANALYSIS_CONCURRENCY)
