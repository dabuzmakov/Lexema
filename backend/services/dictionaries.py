import re
from functools import lru_cache
from pathlib import Path
from typing import Dict, Set


DICTIONARIES_DIR = Path(__file__).resolve().parents[1] / "resources" / "dictionaries"


def normalize_dictionary_entry(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower().replace("ё", "е"))


@lru_cache(maxsize=16)
def load_word_set(filename: str) -> Set[str]:
    safe_filename = filename.strip()
    if not safe_filename.endswith(".txt") or "/" in safe_filename or "\\" in safe_filename:
        raise ValueError(f"Invalid dictionary filename: {filename}")

    path = DICTIONARIES_DIR / safe_filename
    if not path.is_file():
        raise FileNotFoundError(f"Dictionary file not found: {path}")

    entries: Set[str] = set()
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        entry = normalize_dictionary_entry(raw_line)
        if not entry or entry.startswith("#"):
            continue
        entries.add(entry)
    return entries


def get_ru_stop_words() -> Set[str]:
    return load_word_set("stop_words_ru.txt")


def get_ru_water_words() -> Set[str]:
    return load_word_set("water_words_ru.txt")


@lru_cache(maxsize=1)
def get_ru_water_dictionary() -> Dict[str, Set[str]]:
    entries = get_ru_water_words()
    return {
        "words": {entry for entry in entries if " " not in entry},
        "phrases": {entry for entry in entries if " " in entry},
    }
