# Лексема

Лексема - веб-приложение для анализа текстов. Система помогает готовить и проверять тексты по SEO-метрикам, сравнивать два документа, искать орфографические и грамматические проблемы, управлять корпусом документов и выгружать результаты анализа.

URFU: http://10.40.241.61/ (Только из внутренней сети УрФУ)

## Возможности

- хранение пользовательского корпуса документов по `browser_id` из браузера;
- загрузка `.txt` файлов через файловый диалог и drag-and-drop;
- создание, редактирование, удаление и поиск документов в интерфейсе;
- SEO-анализ выбранных документов:
  - частотность слов;
  - биграммы и триграммы;
  - проверка ключевых слов и фраз;
  - переспам по заданному порогу плотности;
  - водность по локальному словарю маркеров;
  - смешение кириллицы и латиницы;
  - структура текста по абзацам и предложениям;
  - рекомендации и данные для графиков;
- сравнение двух документов:
  - различия по объему, словарю, водности, структуре и переспаму;
  - пересечение словаря и n-грамм;
  - cosine similarity по частотам слов;
  - сравнение покрытия ключевых слов;
- орфографическая проверка через локальный LanguageTool;
- настройка стоп-слов, ключевых слов, лемматизации, n-грамм и порога переспама;
- сохранение последних результатов анализа в PostgreSQL;
- экспорт SEO и сравнительных таблиц в CSV, а SEO-отчета - в ZIP через API;

## Архитектура

```text
text-analyzer/
├─ backend/                    # FastAPI backend
│  ├─ routers/                 # HTTP endpoints
│  ├─ services/                # SEO, compare, spelling, export, text utilities
│  ├─ resources/dictionaries/  # локальные словари stop/water words
│  └─ tests/                   # backend contract/service tests
├─ frontend/                   # React 19 + TypeScript + Vite
│  └─ src/
│     ├─ Api/                  # frontend API client
│     ├─ App/                  # корневой компонент
│     ├─ Components/           # страницы, layout, UI, widgets
│     ├─ Hooks/                # состояние приложения
│     ├─ Models/               # TypeScript-контракты
│     ├─ Styles/               # SCSS
│     └─ Utils/                # browser_id, форматирование, markdown, нормализация
├─ database/migrations/        # PostgreSQL migrations
├─ deploy/university/          # Docker/Caddy/Nginx для сервера вуза
├─ render.yaml                 # Render Blueprint
├─ API.md                      # полный контракт API
└─ README.md
```

## Технологии

- Frontend: React 19, TypeScript, Vite, SCSS Modules, lucide-react.
- Backend: Python 3.12, FastAPI, Pydantic, asyncpg.
- Анализ текста: pymorphy3 для русской лемматизации, локальные UTF-8 словари, LanguageTool через `language-tool-python`.
- База данных: PostgreSQL 16.
- Деплой: Render Blueprint и Docker Compose для внутреннего сервера.
- CI: GitHub Actions для миграций, frontend build, backend tests и smoke checks.

## Модель данных и состояние

Приложение не использует регистрацию пользователей. Frontend создает и хранит в `localStorage` идентификатор `lexema_browser_id`, а backend связывает его с записью в `app_clients`.

Основные сущности:

- `app_clients` - browser-клиенты приложения.
- `documents` - документы клиента, их содержимое, количество символов и грубое количество слов.
- `analysis_settings` - настройки анализа клиента.
- `analysis_results` - последний результат каждого типа анализа: `seo`, `compare`, `spelling`.
- `schema_migrations` - примененные SQL-миграции.

Backend не создает схему базы при старте. Перед рабочим запуском нужно применить SQL-миграции.

## Backend API

Подробный контракт находится в [API.md](./API.md).

Основные группы endpoint'ов:

- `GET /health` - healthcheck без проверки LanguageTool.
- `GET /app/state` - начальное состояние frontend после reload.
- `/documents` - CRUD документов.
- `/settings` - чтение и сохранение настроек анализа.
- `/analysis/seo` - SEO-анализ выбранных документов.
- `/analysis/compare` - сравнение двух документов.
- `/analysis/spelling` - проверка выбранных документов через LanguageTool.
- `/export/csv/...` и `/export/zip/seo` - экспорт сохраненных результатов.

Все JSON-ответы успешных endpoints, кроме `/health` и файлового экспорта, возвращаются в envelope:

```json
{
  "status": "success",
  "data": {}
}
```

## Переменные окружения

### Backend

| Переменная | Назначение | Значение по умолчанию |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Если не задана, все endpoints с БД вернут 503. | нет |
| `CORS_ALLOW_ORIGINS` | Список разрешенных origins через запятую. | localhost-порты и Render frontend |
| `DB_POOL_MIN_SIZE` | Минимальный размер asyncpg pool на worker. | `1` |
| `DB_POOL_MAX_SIZE` | Максимальный размер asyncpg pool на worker. | `8` |
| `SEO_ANALYSIS_CONCURRENCY` | Одновременные SEO-анализы на worker. | `2` |
| `COMPARE_ANALYSIS_CONCURRENCY` | Одновременные compare-анализы на worker. | `1` |
| `SPELLING_ANALYSIS_CONCURRENCY` | Одновременные LanguageTool-проверки на worker. | `1` |
| `MAX_DOCUMENTS_PER_CLIENT` | Максимум документов на browser-клиента. | `30` |
| `MAX_DOCUMENT_CHARS` | Максимум символов в одном документе. | `50000` |
| `MAX_TOTAL_CHARS_PER_SEO_ANALYSIS` | Максимальный суммарный объем выбранных документов для SEO. | `1500000` |
| `MAX_TOTAL_CHARS_PER_SPELLING_ANALYSIS` | Максимальный суммарный объем для орфографической проверки. | `1500000` |
| `MAX_DOCUMENT_CHARS_PER_COMPARE` | Максимальный объем каждого документа в сравнении. | `150000` |

### Frontend

| Переменная | Назначение |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL backend API. Для Render это URL backend-сервиса. Для сервера вуза обычно `http://<server>/api`. |

## Миграции базы данных

Миграции лежат в `database/migrations` и применяются скриптом:

```bash
export DATABASE_URL=postgresql://user:password@host:5432/dbname
bash database/apply-migrations.sh
```

Скрипт:

- требует установленный `psql`;
- создает таблицу `schema_migrations`;
- применяет только еще не примененные `.sql` файлы;
- останавливается при первой SQL-ошибке.

Актуальный порядок миграций:

1. `001_create_app_clients.sql`
2. `002_create_documents.sql`
3. `003_create_analysis_settings.sql`
4. `004_create_analysis_results.sql`
5. `005_add_analysis_lookup_indexes.sql`

## Команда

- Frontend: Бузмаков Даниил Александрович
- Backend: Бусыгин Степан Алексеевич
- DevOps / database: Костарев Егор Евгеньевич
- TeamLead / документация / аналитика: Губин Павел Сергеевич
- Тестирование: Четвертных Лев Константинович
