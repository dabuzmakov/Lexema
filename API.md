# API Contract

HTTP-контракт, который использует приложение Лексема. Base URL задается во frontend через `VITE_API_BASE_URL`.

Для Render frontend обычно ходит напрямую на публичный URL backend. Для university deploy frontend ходит на `http://<server>/api`, а Caddy удаляет префикс `/api` перед проксированием в backend, поэтому реальные backend-маршруты остаются без префикса.

## Общие правила

### Идентификация клиента

Приложение не использует авторизацию. Frontend хранит `browser_id` в `localStorage` под ключом `lexema_browser_id` и передает его в каждый state/data endpoint.

`browser_id` передается:

- в query string для `GET`/`DELETE`;
- в JSON body для `POST`/`PUT`/`PATCH`.

Backend нормализует `browser_id`, создает запись в `app_clients`, если клиента еще нет, и обновляет `last_seen_at`.

### JSON envelope

Все успешные JSON endpoints, кроме `/health`, возвращают envelope:

```json
{
  "status": "success",
  "data": {}
}
```

Некоторые endpoints могут дополнительно вернуть верхнеуровневое поле `message`.

Файловый экспорт не использует envelope и возвращает `text/csv` или `application/zip`.

### Ошибки

Ошибки возвращаются стандартным форматом FastAPI:

```json
{
  "detail": "DOCUMENT_NOT_FOUND"
}
```

или структурированным payload:

```json
{
  "detail": {
    "code": "DOCUMENTS_NOT_FOUND",
    "missing_document_ids": ["doc-1"]
  }
}
```

Ошибки валидации Pydantic имеют стандартный вид FastAPI с массивом `detail`.

Частые коды:

| HTTP | `detail` / `detail.code` | Когда возникает |
| --- | --- | --- |
| 400 | `DOCUMENT_LIMIT_REACHED` | Превышен лимит документов клиента. |
| 400 | `TEXT_TOO_LARGE` | Один документ больше `MAX_DOCUMENT_CHARS`. |
| 400 | `TOTAL_ANALYSIS_TEXT_TOO_LARGE` | Суммарный текст для SEO больше лимита. |
| 400 | `TOTAL_SPELLING_TEXT_TOO_LARGE` | Суммарный текст для spelling больше лимита. |
| 400 | `COMPARE_DOCUMENT_TOO_LARGE` | Один из сравниваемых документов больше лимита. |
| 400 | `DOCUMENTS_NOT_FOUND` | Выбранные документы не найдены у клиента. |
| 400 | `DOCUMENT_IDS_REQUIRED` | Для spelling не переданы документы. |
| 400 | `DOCUMENTS_MUST_BE_DIFFERENT` | В compare выбран один и тот же документ. |
| 400 | `DOCUMENT_EMPTY` | Документ пустой для compare. |
| 404 | `DOCUMENT_NOT_FOUND` | Документ не найден при update/delete. |
| 404 | `ANALYSIS_NOT_FOUND` | Экспорт запрошен до выполнения анализа. |
| 503 | `Database is not configured` | Backend запущен без `DATABASE_URL`. |
| 503 | `SPELLING_ENGINE_UNAVAILABLE` | Java/LanguageTool недоступен. |

### Лимиты по умолчанию

| Лимит | Значение |
| --- | --- |
| Документов на клиента | `30` |
| Символов в одном документе | `150000` |
| Символов суммарно для SEO | `300000` |
| Символов суммарно для spelling | `100000` |
| Символов в каждом документе compare | `150000` |

## Общие типы

### `DocumentItem`

```json
{
  "id": "client-or-generated-id",
  "client_document_id": "client-or-generated-id",
  "database_id": 42,
  "title": "Документ",
  "content": "Текст документа",
  "char_count": 15,
  "raw_word_count": 2,
  "created_at": "2026-05-24T10:00:00+00:00",
  "updated_at": "2026-05-24T10:00:00+00:00"
}
```

`id` в публичном контракте равен `client_document_id`. Backend также принимает PostgreSQL `database_id` в endpoints выбора документа, чтобы сохранить совместимость.

### `AnalysisSettings`

```json
{
  "stop_words": {
    "mode": "default",
    "custom": []
  },
  "keywords": [],
  "lemmatization": true,
  "ngrams": {
    "sizes": [2, 3]
  },
  "spam": {
    "threshold_percent": 3
  }
}
```

Поля:

- `stop_words.mode`: `off`, `default`, `custom`, `default_custom`.
- `stop_words.custom`: пользовательские стоп-слова и фразы; backend разбивает элементы по `\n`, `,`, `;`, нормализует и удаляет дубли.
- `keywords`: ключевые слова и фразы; backend разбивает и нормализует аналогично.
- `lemmatization`: включает нормализацию русских слов через `pymorphy3`.
- `ngrams.sizes`: backend оставляет только `2` и `3`.
- `spam.threshold_percent`: порог плотности для переспама.

### `LastAnalysisResult<T>`

```json
{
  "analysis_type": "seo",
  "selected_document_ids": ["doc-1"],
  "params_snapshot": {},
  "result": {},
  "is_actual": true,
  "invalidation_reason": null,
  "created_at": "2026-05-24T10:00:00+00:00",
  "updated_at": "2026-05-24T10:00:00+00:00"
}
```

`analysis_type`: `seo`, `compare` или `spelling`.

`is_actual=false` означает, что документы или настройки изменились после сохранения результата. UI может показывать результат, но должен считать его устаревшим.

## Health

### `GET /health`

Легкий healthcheck. Не требует подключения к БД, не проверяет наличие таблиц и не стартует LanguageTool.

Response `200`:

```json
{
  "status": "ok",
  "service": "lexema-api",
  "db_configured": true,
  "timestamp": "2026-05-24T10:00:00+00:00"
}
```

## App State

### `GET /app/state?browser_id=...`

Возвращает полное состояние, нужное frontend после загрузки страницы.

Query:

| Поле | Тип | Обязательное |
| --- | --- | --- |
| `browser_id` | string | да |

Response `200`:

```json
{
  "status": "success",
  "data": {
    "documents": [],
    "settings": {
      "stop_words": { "mode": "default", "custom": [] },
      "keywords": [],
      "lemmatization": true,
      "ngrams": { "sizes": [2, 3] },
      "spam": { "threshold_percent": 3 }
    },
    "last_results": {
      "seo": null,
      "compare": null,
      "spelling": null
    }
  }
}
```

`last_results.*` содержит `LastAnalysisResult<T>` или `null`.

## Documents

### `GET /documents?browser_id=...`

Возвращает документы клиента, отсортированные по `updated_at DESC, id DESC`.

Response `200`:

```json
{
  "status": "success",
  "data": [
    {
      "id": "doc-1",
      "client_document_id": "doc-1",
      "database_id": 1,
      "title": "Документ",
      "content": "Текст",
      "char_count": 5,
      "raw_word_count": 1,
      "created_at": "2026-05-24T10:00:00+00:00",
      "updated_at": "2026-05-24T10:00:00+00:00"
    }
  ]
}
```

### `POST /documents`

Создает один документ. Если `client_document_id` не передан, backend генерирует UUID.

Request:

```json
{
  "browser_id": "browser-id",
  "title": "Документ",
  "content": "Текст документа",
  "client_document_id": "optional-client-id"
}
```

Validation:

- `browser_id`, `title`, `content` обязательны и не должны быть пустыми после `trim`.
- `content` не должен превышать `MAX_DOCUMENT_CHARS`.
- у клиента должно быть меньше `MAX_DOCUMENTS_PER_CLIENT` документов.

Response `200`: `DocumentItem`.

Побочный эффект: результаты `seo`, `compare`, `spelling` клиента становятся неактуальными.

### `PATCH /documents/{document_id}`

Обновляет `title` и/или `content` документа клиента.

Path:

| Поле | Тип | Описание |
| --- | --- | --- |
| `document_id` | string | `client_document_id` или `database_id` |

Request:

```json
{
  "browser_id": "browser-id",
  "title": "Новое название",
  "content": "Новый текст"
}
```

`title` и `content` опциональны по отдельности, но если переданы, не должны быть пустыми после `trim`.

Response `200`: `DocumentItem`.

Побочный эффект: результаты `seo`, `compare`, `spelling` клиента становятся неактуальными.

### `DELETE /documents/{document_id}?browser_id=...`

Удаляет документ клиента.

Response `200`:

```json
{
  "status": "success",
  "data": {
    "message": "Document deleted"
  },
  "message": "Document deleted"
}
```

Побочный эффект: результаты `seo`, `compare`, `spelling` клиента становятся неактуальными.

## Settings

### `GET /settings?browser_id=...`

Возвращает настройки клиента. Если настроек еще нет, backend создает запись со значениями по умолчанию.

Response `200`: `AnalysisSettings`.

### `PUT /settings`

Сохраняет настройки клиента.

Request:

```json
{
  "browser_id": "browser-id",
  "settings": {
    "stop_words": {
      "mode": "default_custom",
      "custom": ["пример", "не учитывать"]
    },
    "keywords": ["ключ", "ключевая фраза"],
    "lemmatization": true,
    "ngrams": {
      "sizes": [2, 3]
    },
    "spam": {
      "threshold_percent": 3
    }
  }
}
```

Response `200`: нормализованный `AnalysisSettings`.

Побочный эффект: результаты `seo` и `compare` клиента становятся неактуальными. `spelling` не инвалидируется, потому что не зависит от SEO-настроек.

## SEO Analysis

### `POST /analysis/seo`

Запускает SEO-анализ выбранных документов. Если `document_ids` пустой, backend анализирует все документы клиента.

Request:

```json
{
  "browser_id": "browser-id",
  "document_ids": ["doc-1", "doc-2"],
  "params": {
    "stop_words": { "mode": "default", "custom": [] },
    "keywords": ["ключ"],
    "lemmatization": true,
    "ngrams": { "sizes": [2, 3] },
    "spam": { "threshold_percent": 3 }
  }
}
```

`params` опционален. Если `params=null`, backend берет сохраненные настройки клиента.

Response `200`: `LastAnalysisResult<SeoResult>`.

### `SeoResult`

```json
{
  "summary": {
    "documents_count": 2,
    "total_words": 1000,
    "unique_words": 430,
    "keywords_total": 3,
    "keywords_found": 2,
    "keywords_missing": 1,
    "spam_warnings_count": 4,
    "water_percent": 21.5,
    "mixed_alphabet_count": 1,
    "spam_level": "medium",
    "keyword_coverage_percent": 66.67
  },
  "words": [
    {
      "word": "пример",
      "count": 12,
      "density": 1.2,
      "length": 6,
      "is_keyword": true
    }
  ],
  "ngrams": [
    {
      "phrase": "ключевая фраза",
      "size": 2,
      "count": 5,
      "density": 0.5,
      "is_keyword": true
    }
  ],
  "keywords": [
    {
      "keyword": "ключевая фраза",
      "type": "ngram",
      "count": 5,
      "density": 0.5,
      "status": "normal"
    }
  ],
  "spam_warnings": [
    {
      "item": "пример",
      "type": "word",
      "count": 80,
      "density": 8,
      "threshold": 3,
      "status": "spam"
    }
  ],
  "water": {
    "percent": 21.5,
    "level": "low",
    "water_units_count": 215,
    "total_words": 1000,
    "markers": [{ "marker": "например", "count": 10 }],
    "top_markers": [{ "marker": "например", "count": 10 }]
  },
  "mixed_alphabet_words": [
    {
      "word": "pекламa",
      "count": 1,
      "suggestion": "реклама"
    }
  ],
  "structure": {
    "paragraphs_count": 4,
    "sentences_count": 20,
    "words_count": 1000,
    "avg_words_per_paragraph": 250,
    "avg_words_per_sentence": 50,
    "paragraphs": [
      {
        "index": 1,
        "words_count": 250,
        "sentences_count": 5,
        "percent_of_text": 25,
        "preview": "Первые 160 символов абзаца"
      }
    ]
  },
  "recommendations": ["Текст рекомендации"],
  "lexicon": {
    "stop_words": ["и", "в"],
    "water_markers": ["например"]
  },
  "charts": {
    "top_words": [{ "label": "пример", "value": 12 }],
    "top_ngrams": [{ "label": "ключевая фраза", "value": 5 }],
    "keyword_coverage": { "found": 2, "total": 3 },
    "water": { "percent": 21.5, "level": "low" },
    "spam": { "count": 4, "level": "medium" },
    "structure": {
      "paragraph_share": [{ "label": "Абзац 1", "value": 25 }],
      "paragraph_words": [{ "label": "Абзац 1", "value": 250 }],
      "sentence_words": [{ "label": "Абзац 1", "value": 50 }]
    }
  }
}
```

Статусы ключей:

- `missing` - ключ не найден;
- `low` - плотность ниже 0.1%;
- `normal` - нормальная плотность;
- `high` - плотность близка к порогу;
- `spam` - плотность выше порога.

`water.level`: `low`, `medium`, `high`.

`spam_level`: `low`, `medium`, `high`.

## Compare Analysis

### `POST /analysis/compare`

Сравнивает два разных документа одного клиента. Настройки берутся из сохраненного `AnalysisSettings`.

Request:

```json
{
  "browser_id": "browser-id",
  "document_a_id": "doc-a",
  "document_b_id": "doc-b"
}
```

Response `200`: `LastAnalysisResult<CompareAnalysisResult>`.

### `CompareAnalysisResult`

```json
{
  "documents": {
    "a": {
      "document_id": "doc-a",
      "title": "Документ A",
      "char_count": 1000,
      "word_count": 160
    },
    "b": {
      "document_id": "doc-b",
      "title": "Документ B",
      "char_count": 1200,
      "word_count": 190
    }
  },
  "summary": {
    "word_count_diff": -30,
    "word_count_diff_percent": -15.79,
    "unique_words_diff": -12,
    "water_diff": 3.5,
    "keyword_coverage_a": 50,
    "keyword_coverage_b": 75,
    "vocabulary_overlap_percent": 42.1,
    "ngram_overlap_percent": 20,
    "cosine_similarity_percent": 63.4
  },
  "metrics": {
    "char_count": {
      "a": 1000,
      "b": 1200,
      "diff": -200,
      "diff_percent": -16.67
    },
    "word_count": {
      "a": 160,
      "b": 190,
      "diff": -30,
      "diff_percent": -15.79
    }
  },
  "keywords_comparison": [
    {
      "keyword": "ключ",
      "a": { "found": true, "count": 2, "density": 1.25 },
      "b": { "found": false, "count": 0, "density": 0 },
      "diff_count": 2,
      "diff_density": 1.25,
      "status": "missing_in_b"
    }
  ],
  "words_comparison": {
    "common": [
      {
        "word": "пример",
        "a_count": 4,
        "b_count": 2,
        "a_density": 2.5,
        "b_density": 1.05,
        "diff_count": 2,
        "diff_density": 1.45
      }
    ],
    "only_a": [{ "word": "уникальное", "count": 1, "density": 0.63 }],
    "only_b": [{ "word": "референс", "count": 3, "density": 1.58 }]
  },
  "ngrams_comparison": {
    "common": [
      {
        "phrase": "ключевая фраза",
        "n": 2,
        "a_count": 2,
        "b_count": 1,
        "a_density": 1.25,
        "b_density": 0.53,
        "diff_count": 1,
        "diff_density": 0.72
      }
    ],
    "only_a": [{ "phrase": "только здесь", "n": 2, "count": 1, "density": 0.63 }],
    "only_b": [{ "phrase": "только там", "n": 2, "count": 1, "density": 0.53 }]
  },
  "water_comparison": {
    "a": { "percent": 10.5, "words_count": 17, "status": "low" },
    "b": { "percent": 7, "words_count": 13, "status": "low" },
    "diff_percent": 3.5,
    "words_count": { "a": 17, "b": 13, "diff": 4, "diff_percent": 30.77 }
  },
  "spam_comparison": {
    "a": { "risk": "low", "warnings_count": 0, "warnings": [] },
    "b": { "risk": "medium", "warnings_count": 2, "warnings": [] },
    "diff_warnings": -2
  },
  "structure_comparison": {
    "paragraphs_count": { "a": 3, "b": 4, "diff": -1, "diff_percent": -25 },
    "sentences_count": { "a": 10, "b": 12, "diff": -2, "diff_percent": -16.67 },
    "avg_paragraph_length": { "a": 53.33, "b": 47.5, "diff": 5.83, "diff_percent": 12.27 },
    "avg_sentence_length": { "a": 16, "b": 15.83, "diff": 0.17, "diff_percent": 1.07 }
  },
  "similarity": {
    "vocabulary_overlap_percent": 42.1,
    "ngram_overlap_percent": 20,
    "cosine_similarity_percent": 63.4
  },
  "insights": [
    {
      "type": "warning",
      "code": "KEYWORDS_MISSING_IN_A",
      "message": "Текст insight"
    }
  ]
}
```

`metrics` может включать:

- `char_count`;
- `word_count`;
- `unique_words`;
- `water_percent`;
- `spam_warnings_count`;
- `paragraphs_count`;
- `sentences_count`;
- `avg_paragraph_length`;
- `avg_sentence_length`.

Статусы `keywords_comparison.status`:

- `same`;
- `missing_in_a`;
- `missing_in_b`;
- `higher_in_a`;
- `higher_in_b`;
- `lower_in_a`;
- `lower_in_b`.

Compare rows ограничиваются первыми 50 элементами в каждом списке.

## Spelling Analysis

### `POST /analysis/spelling`

Проверяет выбранные документы через локальный LanguageTool. Документы обязательны: пустой `document_ids` не означает "все документы".

Request:

```json
{
  "browser_id": "browser-id",
  "document_ids": ["doc-1"]
}
```

Backend определяет язык каждого документа по количеству кириллических и латинских символов:

- `ru-RU`, если кириллицы не меньше, чем латиницы;
- `en-US`, иначе.

Response `200`: `LastAnalysisResult<SpellingResult>`.

`params_snapshot` для spelling:

```json
{
  "language": "auto",
  "engine": "LanguageTool",
  "max_check_time_millis": 8000
}
```

### `SpellingResult`

```json
{
  "summary": {
    "documents_count": 1,
    "total_issues": 2,
    "spelling_count": 1,
    "grammar_count": 1,
    "style_count": 0,
    "typography_count": 0,
    "punctuation_count": 0,
    "other_count": 0,
    "languages": ["ru-RU"],
    "checked_at": "2026-05-24T10:00:00+00:00",
    "engine": "LanguageTool",
    "max_check_time_millis": 8000
  },
  "documents": [
    {
      "document_id": "doc-1",
      "title": "Документ",
      "language": "ru-RU",
      "languages": ["ru-RU"],
      "text_length": 1000,
      "checked_char_count": 1000,
      "truncated": false,
      "issues_count": 2,
      "issues": [
        {
          "id": "doc-1:1:RULE_ID:42",
          "rule_id": "RULE_ID",
          "message": "Описание ошибки",
          "short_message": "Коротко",
          "category": "spelling",
          "category_name": "TYPOS",
          "severity": "error",
          "offset": 42,
          "length": 6,
          "context": "Фрагмент вокруг ошибки",
          "context_offset": 10,
          "word": "ашибка",
          "replacements": ["ошибка"],
          "sentence": "Предложение с ошибкой.",
          "language": "ru-RU"
        }
      ]
    }
  ]
}
```

Категории:

- `spelling`;
- `grammar`;
- `punctuation`;
- `style`;
- `typography`;
- `other`.

Severity:

- `error` для spelling;
- `info` для style/typography;
- `warning` для остальных категорий.

Если Java или LanguageTool недоступны, endpoint возвращает:

```json
{
  "detail": "SPELLING_ENGINE_UNAVAILABLE"
}
```

с HTTP `503`.

## Export

Export endpoints используют последние сохраненные результаты из `analysis_results` и не запускают анализ заново. Если результата нет, возвращается `404 ANALYSIS_NOT_FOUND`.

### `GET /export/csv/seo/{table_type}?browser_id=...`

Возвращает `text/csv; charset=utf-8` с BOM UTF-8.

`table_type`:

| Значение | Файл | Данные |
| --- | --- | --- |
| `words` | `seo_words.csv` | `words` из `SeoResult`. |
| `ngrams` | `seo_ngrams.csv` | `ngrams` из `SeoResult`. |
| `keywords` | `seo_keywords.csv` | `keywords` из `SeoResult`. |
| `spam` | `seo_spam.csv` | `spam_warnings` из `SeoResult`. |
| `water` | `seo_water.csv` | summary водности и `top_markers`. |
| `mixed` | `seo_mixed.csv` | `mixed_alphabet_words` из `SeoResult`. |

Response headers:

```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="seo_words.csv"
```

### `GET /export/csv/compare/{table_type}?browser_id=...`

Возвращает `text/csv; charset=utf-8` с BOM UTF-8.

`table_type`:

| Значение | Файл | Данные |
| --- | --- | --- |
| `words` | `compare_words.csv` | `words_comparison.common`. |
| `ngrams` | `compare_ngrams.csv` | `ngrams_comparison.common`. |
| `keywords` | `compare_keywords.csv` | `keywords_comparison`. |

### `GET /export/zip/seo?browser_id=...`

Возвращает ZIP-архив `seo_report.zip` со всеми SEO CSV:

- `seo_words.csv`;
- `seo_ngrams.csv`;
- `seo_keywords.csv`;
- `seo_spam.csv`;
- `seo_water.csv`;
- `seo_mixed.csv`.

Response headers:

```http
Content-Type: application/zip
Content-Disposition: attachment; filename="seo_report.zip"
```

## Frontend usage map

Актуальный frontend использует:

| Frontend API module | Backend endpoints |
| --- | --- |
| `appApi.ts` | `GET /app/state` |
| `documentsApi.ts` | `GET /documents`, `POST /documents`, `PATCH /documents/{document_id}`, `DELETE /documents/{document_id}` |
| `settingsApi.ts` | `GET /settings`, `PUT /settings` |
| `analysisApi.ts` | `POST /analysis/seo`, `POST /analysis/spelling` |
| `compareApi.ts` | `POST /analysis/compare` |
| `exportApi.ts` | `GET /export/csv/seo/{table_type}`, `GET /export/csv/compare/{table_type}`, `GET /export/zip/seo` |
