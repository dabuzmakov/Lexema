import asyncio
import sys
import types
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if "asyncpg" not in sys.modules:
    sys.modules["asyncpg"] = types.SimpleNamespace(Connection=object, Record=object)

from services.dictionaries import (  # noqa: E402
    get_ru_stop_words,
    get_ru_water_dictionary,
    get_ru_water_words,
    load_word_set,
    normalize_dictionary_entry,
)
from schemas import AnalysisSettings  # noqa: E402
from services.seo_analysis import build_seo_result  # noqa: E402


class DictionaryLoaderTest(unittest.TestCase):
    def test_loads_and_normalizes_stop_words(self):
        stop_words = get_ru_stop_words()

        self.assertIn("и", stop_words)
        self.assertIn("в", stop_words)
        self.assertIn("на", stop_words)
        self.assertIn("что", stop_words)
        self.assertIn("это", stop_words)
        self.assertIn("вследствие", stop_words)
        self.assertIn("кое-кто", stop_words)
        self.assertIn("какой-либо", stop_words)
        self.assertIn("насчет", stop_words)
        self.assertEqual(normalize_dictionary_entry("  Всё   ЕЩЁ "), "все еще")

    def test_loads_water_words_and_phrases(self):
        water_words = get_ru_water_words()
        water_dictionary = get_ru_water_dictionary()

        self.assertIn("очень", water_words)
        self.assertIn("например", water_words)
        self.assertIn("в целом", water_words)
        self.assertIn("на сегодняшний день", water_words)
        self.assertIn("очень", water_dictionary["words"])
        self.assertIn("в целом", water_dictionary["phrases"])

    def test_loader_is_cached(self):
        self.assertIs(load_word_set("stop_words_ru.txt"), load_word_set("stop_words_ru.txt"))


class SeoDictionaryIntegrationTest(unittest.TestCase):
    def test_water_words_are_not_system_stop_words(self):
        text = "Текст содержит очень конкретный термин. Например, термин повторяется."
        settings = AnalysisSettings()
        result = asyncio.run(
            build_seo_result(
                [{"id": "1", "title": "doc", "content": text}],
                settings,
            )
        )

        water_markers = {row["marker"] for row in result["water"]["markers"]}
        top_words = {row["word"] for row in result["words"]}

        self.assertIn("очень", water_markers)
        self.assertIn("например", water_markers)
        self.assertIn("термин", top_words)
        self.assertNotIn("и", top_words)

    def test_custom_stop_words_still_filter_top_words(self):
        text = "Термин термин пример"
        settings = AnalysisSettings(stop_words={"mode": "custom", "custom": ["термин"]})
        result = asyncio.run(
            build_seo_result(
                [{"id": "1", "title": "doc", "content": text}],
                settings,
            )
        )

        top_words = {row["word"] for row in result["words"]}
        self.assertNotIn("термин", top_words)
        self.assertIn("пример", top_words)


if __name__ == "__main__":
    unittest.main()
