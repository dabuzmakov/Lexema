import type {
  CompareAnalysisResult,
  CompareTableExportType,
  CompareMetricDiff,
  LastAnalysisResult,
  SeoKeywordRow,
  SeoNgramRow,
  SeoResult,
  SeoSpamWarning,
  SeoStructure,
  SeoTableExportType,
  SeoWordRow,
  SpellingCategory,
  SpellingDocumentResult,
  SpellingIssue,
  SpellingResult,
} from '../Models/analysis'
import type { AppStatePayload } from '../Models/api'
import type { DocumentItem, DocumentPayload, DocumentUpdatePayload } from '../Models/documents'
import { DEFAULT_ANALYSIS_SETTINGS, type AnalysisSettings } from '../Models/settings'
import { pluralizeRu } from '../Utils/lexema'

type MockScenario = 'empty' | 'documents' | 'seo_done' | 'stale'
type MockSpellingCategory = 'spelling' | 'grammar' | 'punctuation' | 'style' | 'typography' | 'other'

interface MockClientState {
  documents: DocumentItem[]
  settings: AnalysisSettings
  last_results: AppStatePayload['last_results']
}

const MOCK_DELAY = Number(import.meta.env.VITE_MOCK_DELAY_MS ?? 250)
const MOCK_SCENARIO = (import.meta.env.VITE_MOCK_SCENARIO ?? 'seo_done') as MockScenario
const STORAGE_KEY = 'lexema_mock_api_state'
const BOOTSTRAP_KEY = 'lexema_mock_api_bootstrap'

const demoDocuments: DocumentItem[] = [
  createMockDocument(
    'doc-1',
    'article-seo.txt',
    'SEO анализ текста помогает найти ключевые слова, оценить водность текста и снизить риск переспама. Купить ноутбук можно после сравнения характеристик, цены и отзывов. Игровой ноутбук должен иметь мощный процессор, видеокарту, SSD накопитель и хороший экран. Контент маркетинг требует понятной структуры, тематических фраз и регулярной оптимизации.',
    '2026-05-03T08:40:00.000Z',
  ),
  createMockDocument(
    'doc-2',
    'competitors-notes.txt',
    'Конкуренты используют ключевые слова купить ноутбук, игровой ноутбук, ноутбук для учебы и обзор ноутбуков. В тексте есть водные конструкции, например в целом и на самом деле. Также встречается слово cайт со смешанной раскладкой.',
    '2026-05-04T11:18:00.000Z',
  ),
  createMockDocument(
    'doc-3',
    'landing-copy.txt',
    'Лендинг сервиса анализа текстов объясняет пользу продукта для редакторов и SEO специалистов. Важно показать экспорт CSV ZIP, Markdown копирование, проверку частотности и рекомендации перед публикацией.',
    '2026-05-05T14:25:00.000Z',
  ),
]

const demoSettings: AnalysisSettings = {
  stop_words: {
    mode: 'default_custom',
    custom: ['сайт', 'http', 'https', 'www'],
  },
  keywords: [
    'ноутбук',
    'купить ноутбук',
    'игровой ноутбук',
    'seo анализ текста',
    'ноутбук для учебы',
  ],
  lemmatization: true,
  ngrams: {
    sizes: [2, 3],
  },
  spam: {
    threshold_percent: 6,
  },
}

const defaultStopWords = new Set([
  'а',
  'без',
  'бы',
  'в',
  'во',
  'для',
  'до',
  'и',
  'или',
  'как',
  'к',
  'на',
  'не',
  'но',
  'о',
  'от',
  'по',
  'при',
  'с',
  'так',
  'то',
  'у',
  'что',
  'это',
])

const waterMarkers = new Set([
  'это',
  'также',
  'важно',
  'например',
  'в целом',
  'на самом деле',
])

const mixedMap: Record<string, string> = {
  a: 'а',
  c: 'с',
  e: 'е',
  o: 'о',
  p: 'р',
  x: 'х',
  y: 'у',
  k: 'к',
  m: 'м',
}

export function getMockAppState(browserId: string) {
  return wait().then(() => getClientState(browserId))
}

export function getMockDocuments(browserId: string) {
  return wait().then(() => getClientState(browserId).documents)
}

export function createMockDocumentApi(browserId: string, payload: DocumentPayload) {
  return wait().then(() => {
    const state = getClientState(browserId)

    if (state.documents.length >= 30) {
      throw new Error('DOCUMENT_LIMIT_REACHED')
    }

    const now = new Date().toISOString()
    const document = createMockDocument(
      payload.client_document_id || createId(),
      payload.title,
      payload.content,
      now,
    )

    state.documents = [document, ...state.documents]
    invalidateSeo(state, 'Документы изменены')
    invalidateCompare(state, 'Документы изменены')
    invalidateSpelling(state, 'Документы изменены')
    setClientState(browserId, state)

    return document
  })
}

export function updateMockDocumentApi(
  browserId: string,
  documentId: string,
  payload: DocumentUpdatePayload,
) {
  return wait().then(() => {
    const state = getClientState(browserId)
    const current = state.documents.find((document) => document.id === documentId)

    if (!current) {
      throw new Error('DOCUMENT_NOT_FOUND')
    }

    const updated = createMockDocument(
      current.id,
      payload.title ?? current.title,
      payload.content ?? current.content,
      current.created_at ?? new Date().toISOString(),
      new Date().toISOString(),
    )

    state.documents = state.documents.map((document) =>
      document.id === documentId ? updated : document,
    )
    invalidateSeo(state, 'Документы изменены')
    invalidateCompare(state, 'Документы изменены')
    invalidateSpelling(state, 'Документы изменены')
    setClientState(browserId, state)

    return updated
  })
}

export function deleteMockDocumentApi(browserId: string, documentId: string) {
  return wait().then(() => {
    const state = getClientState(browserId)
    const nextDocuments = state.documents.filter((document) => document.id !== documentId)

    if (nextDocuments.length === state.documents.length) {
      throw new Error('DOCUMENT_NOT_FOUND')
    }

    state.documents = nextDocuments
    invalidateSeo(state, 'Документы изменены')
    invalidateCompare(state, 'Документы изменены')
    invalidateSpelling(state, 'Документы изменены')
    setClientState(browserId, state)

    return { message: 'Document deleted' }
  })
}

export function getMockSettings(browserId: string) {
  return wait().then(() => getClientState(browserId).settings)
}

export function saveMockSettings(browserId: string, settings: AnalysisSettings) {
  return wait().then(() => {
    const state = getClientState(browserId)
    state.settings = normalizeSettings(settings)
    invalidateSeo(state, 'Параметры анализа изменены')
    invalidateCompare(state, 'Параметры анализа изменены')
    setClientState(browserId, state)

    return state.settings
  })
}

export function runMockSeoAnalysis(
  browserId: string,
  documentIds: string[],
  settings: AnalysisSettings,
) {
  return wait().then(() => {
    const state = getClientState(browserId)
    const selectedDocuments = documentIds.length
      ? state.documents.filter((document) => documentIds.includes(document.id))
      : state.documents

    if (selectedDocuments.length === 0) {
      throw new Error('DOCUMENTS_NOT_FOUND')
    }

    const normalizedSettings = normalizeSettings(settings)
    const result = buildSeoResult(selectedDocuments, normalizedSettings)
    const lastResult: LastAnalysisResult<SeoResult> = {
      analysis_type: 'seo',
      selected_document_ids: selectedDocuments.map((document) => document.id),
      params_snapshot: normalizedSettings,
      result,
      is_actual: true,
      invalidation_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    state.settings = normalizedSettings
    state.last_results.seo = lastResult
    setClientState(browserId, state)

    return lastResult
  })
}

export function runMockCompareAnalysis(
  browserId: string,
  documentAId: string,
  documentBId: string,
) {
  return wait().then(() => {
    const state = getClientState(browserId)

    if (!documentAId || !documentBId) {
      throw new Error('DOCUMENT_IDS_REQUIRED')
    }

    if (documentAId === documentBId) {
      throw new Error('DOCUMENTS_MUST_BE_DIFFERENT')
    }

    const documentA = state.documents.find((document) => document.id === documentAId)
    const documentB = state.documents.find((document) => document.id === documentBId)

    if (!documentA || !documentB) {
      throw new Error('DOCUMENTS_NOT_FOUND')
    }

    const settings = normalizeSettings(state.settings)
    const result = buildCompareResult(documentA, documentB, settings)
    const lastResult: LastAnalysisResult<CompareAnalysisResult> = {
      analysis_type: 'compare',
      selected_document_ids: [documentA.id, documentB.id],
      params_snapshot: settings,
      result,
      is_actual: true,
      invalidation_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    state.last_results.compare = lastResult
    setClientState(browserId, state)

    return lastResult
  })
}

export function runMockSpellingAnalysis(browserId: string, documentIds: string[]) {
  return wait().then(() => {
    const state = getClientState(browserId)
    const selectedDocuments = state.documents.filter((document) => documentIds.includes(document.id))

    if (documentIds.length === 0) {
      throw new Error('DOCUMENT_IDS_REQUIRED')
    }

    if (selectedDocuments.length !== documentIds.length) {
      throw new Error('DOCUMENTS_NOT_FOUND')
    }

    const result = buildSpellingResult(selectedDocuments)
    const lastResult: LastAnalysisResult<SpellingResult> = {
      analysis_type: 'spelling',
      selected_document_ids: selectedDocuments.map((document) => document.id),
      params_snapshot: {
        language: 'auto',
        engine: 'LanguageTool',
        max_check_time_millis: 8000,
      },
      result,
      is_actual: true,
      invalidation_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    state.last_results.spelling = lastResult
    setClientState(browserId, state)

    return lastResult
  })
}

export function downloadMockSeoCsv(browserId: string, type: SeoTableExportType) {
  return wait().then(() => {
    const result = requireSeoResult(browserId)
    const { headers, rows } = tableToCsv(type, result)
    const csv = toCsv(headers, rows)

    return new Blob([csv], { type: 'text/csv;charset=utf-8' })
  })
}

export function downloadMockCompareCsv(browserId: string, type: CompareTableExportType) {
  return wait().then(() => {
    const state = getClientState(browserId)
    const result = state.last_results.compare?.result

    if (!result) {
      throw new Error('Сравнительный анализ ещё не выполнен')
    }

    const { headers, rows } = compareTableToCsv(type, result)
    const csv = toCsv(headers, rows)
    return new Blob([csv], { type: 'text/csv;charset=utf-8' })
  })
}

export function downloadMockSeoZip(browserId: string) {
  return wait().then(() => {
    const result = requireSeoResult(browserId)
    const files = (['words', 'ngrams', 'keywords', 'spam', 'water', 'mixed'] as SeoTableExportType[])
      .map((type) => {
        const { headers, rows, fileName } = tableToCsv(type, result)
        return {
          name: fileName,
          content: toCsv(headers, rows),
        }
      })

    return createZipBlob(files)
  })
}

export function resetMockApi(browserId: string, scenario: MockScenario = MOCK_SCENARIO) {
  const store = getStore()
  delete store[browserId]
  setStore(store)
  window.localStorage.removeItem(`${BOOTSTRAP_KEY}:${browserId}`)
  return getClientState(browserId, scenario)
}

function getClientState(browserId: string, scenario = MOCK_SCENARIO): MockClientState {
  const store = getStore()
  const bootstrapKey = `${BOOTSTRAP_KEY}:${browserId}`

  if (!store[browserId] || window.localStorage.getItem(bootstrapKey) !== scenario) {
    store[browserId] = createScenarioState(scenario)
    setStore(store)
    window.localStorage.setItem(bootstrapKey, scenario)
  }

  return structuredCloneSafe(store[browserId])
}

function setClientState(browserId: string, state: MockClientState) {
  const store = getStore()
  store[browserId] = state
  setStore(store)
}

function getStore(): Record<string, MockClientState> {
  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw) as Record<string, MockClientState>
  } catch {
    return {}
  }
}

function setStore(store: Record<string, MockClientState>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function createScenarioState(scenario: MockScenario): MockClientState {
  const documents = scenario === 'empty' ? [] : demoDocuments
  const settings = scenario === 'empty' ? DEFAULT_ANALYSIS_SETTINGS : demoSettings
  const state: MockClientState = {
    documents,
    settings,
    last_results: {
      seo: null,
      compare: null,
      spelling: null,
    },
  }

  if (scenario === 'seo_done' || scenario === 'stale') {
    const result = buildSeoResult(documents, settings)
    state.last_results.seo = {
      analysis_type: 'seo',
      selected_document_ids: documents.map((document) => document.id),
      params_snapshot: settings,
      result,
      is_actual: scenario !== 'stale',
      invalidation_reason: scenario === 'stale' ? 'Документы или параметры были изменены' : null,
      created_at: '2026-05-05T15:00:00.000Z',
      updated_at: '2026-05-05T15:00:00.000Z',
    }

    const spellingResult = buildSpellingResult(documents.slice(0, 2))
    state.last_results.spelling = {
      analysis_type: 'spelling',
      selected_document_ids: documents.slice(0, 2).map((document) => document.id),
      params_snapshot: {
        language: 'auto',
        engine: 'LanguageTool',
        max_check_time_millis: 8000,
      },
      result: spellingResult,
      is_actual: scenario !== 'stale',
      invalidation_reason: scenario === 'stale' ? 'Документы изменены' : null,
      created_at: '2026-05-05T15:05:00.000Z',
      updated_at: '2026-05-05T15:05:00.000Z',
    }

    if (documents.length >= 2) {
      state.last_results.compare = {
        analysis_type: 'compare',
        selected_document_ids: [documents[0].id, documents[1].id],
        params_snapshot: settings,
        result: buildCompareResult(documents[0], documents[1], settings),
        is_actual: scenario !== 'stale',
        invalidation_reason: scenario === 'stale' ? 'Документы или параметры были изменены' : null,
        created_at: '2026-05-05T15:10:00.000Z',
        updated_at: '2026-05-05T15:10:00.000Z',
      }
    }
  }

  return state
}

function createMockDocument(
  id: string,
  title: string,
  content: string,
  createdAt: string,
  updatedAt = createdAt,
): DocumentItem {
  return {
    id,
    client_document_id: id,
    database_id: Math.abs(hashText(id)),
    title,
    content,
    char_count: content.length,
    raw_word_count: tokenize(content).length,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

function buildSeoResult(documents: DocumentItem[], settings: AnalysisSettings): SeoResult {
  const text = documents.map((document) => document.content).join('\n')
  const allWords = tokenize(text)
  const originalWords = tokenize(text, false)
  const stopWords = getStopWords(settings)
  const filteredWords = allWords.filter((word) => !stopWords.has(word))
  const totalWords = Math.max(1, allWords.length)
  const filteredTotal = Math.max(1, filteredWords.length)
  const keywordTerms = normalizeTerms(settings.keywords)
  const wordCounter = countItems(filteredWords)
  const rawWordCounter = countItems(allWords)
  const ngramCounter = countNgrams(filteredWords, settings.ngrams.sizes)
  const rawNgramCounter = countNgrams(allWords, [2, 3])

  const words: SeoWordRow[] = Array.from(wordCounter.entries())
    .map(([word, count]) => ({
      word,
      count,
      density: round(count / filteredTotal * 100),
      length: word.length,
      is_keyword: keywordTerms.includes(word),
    }))
    .sort((left, right) => right.count - left.count)

  const totalNgrams = Math.max(1, Array.from(ngramCounter.values()).reduce((sum, value) => sum + value, 0))
  const ngrams: SeoNgramRow[] = Array.from(ngramCounter.entries())
    .map(([key, count]) => {
      const [size, phrase] = key.split(':')
      return {
        phrase,
        size: Number(size),
        count,
        density: round(count / totalNgrams * 100),
        is_keyword: keywordTerms.includes(phrase),
      }
    })
    .sort((left, right) => right.count - left.count)

  const keywords = keywordTerms.map((keyword) => {
    const size = keyword.split(' ').length
    const count = size === 1
      ? rawWordCounter.get(keyword) ?? 0
      : rawNgramCounter.get(`${size}:${keyword}`) ?? 0
    const density = round(count / totalWords * 100)

    return {
      keyword,
      type: size === 1 ? 'word' : 'ngram',
      count,
      density,
      status: getKeywordStatus(count, density, settings.spam.threshold_percent),
    } satisfies SeoKeywordRow
  })

  const spamWarnings: SeoSpamWarning[] = [
    ...words
      .filter((row) => row.density >= settings.spam.threshold_percent)
      .map((row) => ({
        item: row.word,
        type: 'word',
        count: row.count,
        density: row.density,
        threshold: settings.spam.threshold_percent,
        status: row.density >= settings.spam.threshold_percent * 1.5 ? 'spam' : 'high',
      })),
    ...ngrams
      .filter((row) => row.density >= settings.spam.threshold_percent)
      .map((row) => ({
        item: row.phrase,
        type: 'ngram',
        count: row.count,
        density: row.density,
        threshold: settings.spam.threshold_percent,
        status: row.density >= settings.spam.threshold_percent * 1.5 ? 'spam' : 'high',
      })),
  ]

  const waterCounter = countWater(allWords, text)
  const waterUnits = Array.from(waterCounter.values()).reduce((sum, value) => sum + value, 0)
  const waterPercent = round(waterUnits / totalWords * 100)
  const mixedCounter = countItems(
    originalWords
      .filter(hasMixedAlphabet)
      .map((word) => normalizeWord(word)),
  )
  const mixed = Array.from(mixedCounter.entries()).map(([word, count]) => ({
    word,
    count,
    suggestion: suggestMixedWord(word),
  }))
  const keywordsFound = keywords.filter((keyword) => keyword.count > 0).length

  const recommendations = buildRecommendations(keywords, spamWarnings, waterPercent, mixed.length)
  const structure = buildStructure(text)

  return {
    summary: {
      documents_count: documents.length,
      total_words: allWords.length,
      unique_words: new Set(allWords).size,
      keywords_total: keywordTerms.length,
      keywords_found: keywordsFound,
      keywords_missing: Math.max(0, keywordTerms.length - keywordsFound),
      spam_warnings_count: spamWarnings.length,
      water_percent: waterPercent,
      mixed_alphabet_count: mixed.length,
      spam_level: spamWarnings.length > 2 ? 'high' : spamWarnings.length > 0 ? 'medium' : 'low',
      keyword_coverage_percent: keywordTerms.length ? round(keywordsFound / keywordTerms.length * 100) : 0,
    },
    words,
    ngrams,
    keywords,
    spam_warnings: spamWarnings,
    water: {
      percent: waterPercent,
      level: waterPercent > 45 ? 'high' : waterPercent > 25 ? 'medium' : 'low',
      water_units_count: waterUnits,
      total_words: allWords.length,
      markers: Array.from(waterCounter.entries())
        .sort((left, right) => right[1] - left[1])
        .map(([marker, count]) => ({ marker, count })),
      top_markers: Array.from(waterCounter.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8)
        .map(([marker, count]) => ({ marker, count })),
    },
    mixed_alphabet_words: mixed,
    structure,
    recommendations,
    lexicon: {
      stop_words: Array.from(stopWords),
      water_markers: Array.from(waterMarkers),
    },
    charts: {
      top_words: words.slice(0, 12).map((row) => ({ label: row.word, value: row.count })),
      top_ngrams: ngrams.slice(0, 12).map((row) => ({ label: row.phrase, value: row.count })),
      keyword_coverage: { found: keywordsFound, total: keywordTerms.length },
      water: { percent: waterPercent, level: waterPercent > 45 ? 'high' : waterPercent > 25 ? 'medium' : 'low' },
      spam: {
        count: spamWarnings.length,
        level: spamWarnings.length > 2 ? 'high' : spamWarnings.length > 0 ? 'medium' : 'low',
      },
      structure: {
        paragraph_share: structure.paragraphs.map((paragraph) => ({ label: `Абзац ${paragraph.index}`, value: paragraph.percent_of_text })),
        paragraph_words: structure.paragraphs.map((paragraph) => ({ label: `Абзац ${paragraph.index}`, value: paragraph.words_count })),
        sentence_words: structure.paragraphs.map((paragraph) => ({
          label: `Абзац ${paragraph.index}`,
          value: paragraph.sentences_count ? round(paragraph.words_count / paragraph.sentences_count) : 0,
        })),
      },
    },
  }
}

function buildCompareResult(
  documentA: DocumentItem,
  documentB: DocumentItem,
  settings: AnalysisSettings,
): CompareAnalysisResult {
  const analysisA = buildSeoResult([documentA], settings)
  const analysisB = buildSeoResult([documentB], settings)
  const wordsComparison = compareWordRows(analysisA.words, analysisB.words)
  const ngramsComparison = compareNgramRows(analysisA.ngrams, analysisB.ngrams)
  const wordFreqA = frequencyMap(analysisA.words, 'word')
  const wordFreqB = frequencyMap(analysisB.words, 'word')
  const ngramSetA = new Set(analysisA.ngrams.map((row) => `${row.size}:${row.phrase}`))
  const ngramSetB = new Set(analysisB.ngrams.map((row) => `${row.size}:${row.phrase}`))
  const vocabularyOverlap = jaccardPercent(new Set(Object.keys(wordFreqA)), new Set(Object.keys(wordFreqB)))
  const ngramOverlap = jaccardPercent(ngramSetA, ngramSetB)
  const cosineSimilarity = cosinePercent(wordFreqA, wordFreqB)
  const keywordComparison = compareKeywordRows(analysisA.keywords, analysisB.keywords)
  const waterDiff = round(analysisA.summary.water_percent - analysisB.summary.water_percent)

  return {
    documents: {
      a: {
        document_id: documentA.id,
        title: documentA.title,
        char_count: documentA.char_count,
        word_count: analysisA.summary.total_words,
      },
      b: {
        document_id: documentB.id,
        title: documentB.title,
        char_count: documentB.char_count,
        word_count: analysisB.summary.total_words,
      },
    },
    summary: {
      word_count_diff: analysisA.summary.total_words - analysisB.summary.total_words,
      word_count_diff_percent: diffPercent(analysisA.summary.total_words, analysisB.summary.total_words),
      unique_words_diff: analysisA.summary.unique_words - analysisB.summary.unique_words,
      water_diff: waterDiff,
      keyword_coverage_a: analysisA.summary.keyword_coverage_percent,
      keyword_coverage_b: analysisB.summary.keyword_coverage_percent,
      vocabulary_overlap_percent: vocabularyOverlap,
      ngram_overlap_percent: ngramOverlap,
      cosine_similarity_percent: cosineSimilarity,
    },
    metrics: {
      char_count: metricDiff(documentA.char_count, documentB.char_count),
      word_count: metricDiff(analysisA.summary.total_words, analysisB.summary.total_words),
      unique_words: metricDiff(analysisA.summary.unique_words, analysisB.summary.unique_words),
      water_percent: metricDiff(analysisA.summary.water_percent, analysisB.summary.water_percent),
      spam_warnings_count: metricDiff(analysisA.summary.spam_warnings_count, analysisB.summary.spam_warnings_count),
      paragraphs_count: metricDiff(analysisA.structure?.paragraphs_count, analysisB.structure?.paragraphs_count),
      sentences_count: metricDiff(analysisA.structure?.sentences_count, analysisB.structure?.sentences_count),
      avg_paragraph_length: metricDiff(analysisA.structure?.avg_words_per_paragraph, analysisB.structure?.avg_words_per_paragraph),
      avg_sentence_length: metricDiff(analysisA.structure?.avg_words_per_sentence, analysisB.structure?.avg_words_per_sentence),
    },
    keywords_comparison: keywordComparison,
    words_comparison: wordsComparison,
    ngrams_comparison: ngramsComparison,
    water_comparison: {
      a: {
        percent: analysisA.water.percent,
        words_count: analysisA.water.water_units_count,
        status: analysisA.water.level,
      },
      b: {
        percent: analysisB.water.percent,
        words_count: analysisB.water.water_units_count,
        status: analysisB.water.level,
      },
      diff_percent: waterDiff,
      words_count: metricDiff(analysisA.water.water_units_count, analysisB.water.water_units_count),
    },
    spam_comparison: {
      a: {
        risk: analysisA.summary.spam_level,
        warnings_count: analysisA.spam_warnings.length,
        warnings: analysisA.spam_warnings.slice(0, 8),
      },
      b: {
        risk: analysisB.summary.spam_level,
        warnings_count: analysisB.spam_warnings.length,
        warnings: analysisB.spam_warnings.slice(0, 8),
      },
      diff_warnings: analysisA.spam_warnings.length - analysisB.spam_warnings.length,
    },
    structure_comparison: {
      paragraphs_count: metricDiff(analysisA.structure?.paragraphs_count, analysisB.structure?.paragraphs_count),
      sentences_count: metricDiff(analysisA.structure?.sentences_count, analysisB.structure?.sentences_count),
      avg_paragraph_length: metricDiff(analysisA.structure?.avg_words_per_paragraph, analysisB.structure?.avg_words_per_paragraph),
      avg_sentence_length: metricDiff(analysisA.structure?.avg_words_per_sentence, analysisB.structure?.avg_words_per_sentence),
    },
    similarity: {
      vocabulary_overlap_percent: vocabularyOverlap,
      ngram_overlap_percent: ngramOverlap,
      cosine_similarity_percent: cosineSimilarity,
    },
    insights: buildCompareInsights(
      analysisA.summary.total_words - analysisB.summary.total_words,
      keywordComparison.filter((row) => row.status === 'missing_in_a').length,
      waterDiff,
      vocabularyOverlap,
    ),
  }
}

function metricDiff(aValue = 0, bValue = 0): CompareMetricDiff {
  const a = Number(aValue) || 0
  const b = Number(bValue) || 0
  const diff = round(a - b)

  return {
    a: round(a),
    b: round(b),
    diff,
    diff_percent: b === 0 ? null : round(diff / b * 100),
  }
}

function diffPercent(a: number, b: number) {
  return b === 0 ? null : round((a - b) / b * 100)
}

function compareWordRows(rowsA: SeoWordRow[], rowsB: SeoWordRow[]) {
  const mapA = new Map(rowsA.map((row) => [row.word, row]))
  const mapB = new Map(rowsB.map((row) => [row.word, row]))
  const common = Array.from(mapA.keys())
    .filter((word) => mapB.has(word))
    .map((word) => {
      const rowA = mapA.get(word)!
      const rowB = mapB.get(word)!
      return {
        word,
        a_count: rowA.count,
        b_count: rowB.count,
        a_density: rowA.density,
        b_density: rowB.density,
        diff_count: rowA.count - rowB.count,
        diff_density: round(rowA.density - rowB.density),
      }
    })
    .sort((left, right) => Math.max(right.a_count, right.b_count) - Math.max(left.a_count, left.b_count))

  return {
    common: common.slice(0, 50),
    only_a: rowsA
      .filter((row) => !mapB.has(row.word))
      .slice(0, 50)
      .map((row) => ({ word: row.word, count: row.count, density: row.density })),
    only_b: rowsB
      .filter((row) => !mapA.has(row.word))
      .slice(0, 50)
      .map((row) => ({ word: row.word, count: row.count, density: row.density })),
  }
}

function compareNgramRows(rowsA: SeoNgramRow[], rowsB: SeoNgramRow[]) {
  const keyOf = (row: SeoNgramRow) => `${row.size}:${row.phrase}`
  const mapA = new Map(rowsA.map((row) => [keyOf(row), row]))
  const mapB = new Map(rowsB.map((row) => [keyOf(row), row]))
  const common = Array.from(mapA.keys())
    .filter((key) => mapB.has(key))
    .map((key) => {
      const rowA = mapA.get(key)!
      const rowB = mapB.get(key)!
      return {
        phrase: rowA.phrase,
        n: rowA.size,
        a_count: rowA.count,
        b_count: rowB.count,
        a_density: rowA.density,
        b_density: rowB.density,
        diff_count: rowA.count - rowB.count,
        diff_density: round(rowA.density - rowB.density),
      }
    })
    .sort((left, right) => Math.max(right.a_count, right.b_count) - Math.max(left.a_count, left.b_count))

  return {
    common: common.slice(0, 50),
    only_a: rowsA
      .filter((row) => !mapB.has(keyOf(row)))
      .slice(0, 50)
      .map((row) => ({ phrase: row.phrase, n: row.size, count: row.count, density: row.density })),
    only_b: rowsB
      .filter((row) => !mapA.has(keyOf(row)))
      .slice(0, 50)
      .map((row) => ({ phrase: row.phrase, n: row.size, count: row.count, density: row.density })),
  }
}

function compareKeywordRows(rowsA: SeoKeywordRow[], rowsB: SeoKeywordRow[]) {
  const mapA = new Map(rowsA.map((row) => [row.keyword, row]))
  const mapB = new Map(rowsB.map((row) => [row.keyword, row]))

  return Array.from(new Set([...mapA.keys(), ...mapB.keys()])).map((keyword) => {
    const rowA = mapA.get(keyword)
    const rowB = mapB.get(keyword)
    const countA = rowA?.count ?? 0
    const countB = rowB?.count ?? 0
    const densityA = rowA?.density ?? 0
    const densityB = rowB?.density ?? 0

    return {
      keyword,
      a: { found: countA > 0, count: countA, density: densityA },
      b: { found: countB > 0, count: countB, density: densityB },
      diff_count: countA - countB,
      diff_density: round(densityA - densityB),
      status: getCompareKeywordStatus(countA, densityA, countB, densityB),
    }
  })
}

function getCompareKeywordStatus(countA: number, densityA: number, countB: number, densityB: number) {
  if (countA === 0 && countB > 0) {
    return 'missing_in_a'
  }
  if (countB === 0 && countA > 0) {
    return 'missing_in_b'
  }
  if (countA === countB && Math.abs(densityA - densityB) < 0.01) {
    return 'same'
  }
  return countA > countB || densityA > densityB ? 'higher_in_a' : 'lower_in_a'
}

function frequencyMap<T extends { count: number }>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] ?? '')
    if (value) {
      acc[value] = row.count
    }
    return acc
  }, {})
}

function jaccardPercent(setA: Set<string>, setB: Set<string>) {
  const union = new Set([...setA, ...setB])
  if (union.size === 0) {
    return 0
  }
  const intersectionSize = Array.from(setA).filter((item) => setB.has(item)).length
  return round(intersectionSize / union.size * 100)
}

function cosinePercent(freqA: Record<string, number>, freqB: Record<string, number>) {
  const keysA = Object.keys(freqA)
  const keysB = Object.keys(freqB)
  if (keysA.length === 0 || keysB.length === 0) {
    return 0
  }

  const dot = keysA.reduce((sum, key) => sum + (freqA[key] ?? 0) * (freqB[key] ?? 0), 0)
  const normA = Math.sqrt(keysA.reduce((sum, key) => sum + freqA[key] ** 2, 0))
  const normB = Math.sqrt(keysB.reduce((sum, key) => sum + freqB[key] ** 2, 0))
  return normA && normB ? round(dot / (normA * normB) * 100) : 0
}

function buildCompareInsights(wordDiff: number, missingKeywords: number, waterDiff: number, vocabularyOverlap: number) {
  return [
    wordDiff === 0
      ? null
      : wordDiff < 0
      ? { type: 'info', code: 'A_SHORTER_THAN_B', message: `Текст A короче референса на ${Math.abs(wordDiff)} ${pluralizeRu(wordDiff, ['слово', 'слова', 'слов'])}.` }
      : { type: 'info', code: 'A_LONGER_THAN_B', message: `Текст A длиннее референса на ${wordDiff} ${pluralizeRu(wordDiff, ['слово', 'слова', 'слов'])}.` },
    missingKeywords > 0
      ? { type: 'warning', code: 'KEYWORDS_MISSING_IN_A', message: `В тексте A отсутствуют ${missingKeywords} ${pluralizeRu(missingKeywords, ['ключевая фраза', 'ключевые фразы', 'ключевых фраз'])}, которые есть в референсе.` }
      : null,
    waterDiff > 5
      ? { type: 'warning', code: 'A_WATER_HIGHER', message: `В тексте A водность выше на ${waterDiff}%.` }
      : null,
    vocabularyOverlap < 40
      ? { type: 'info', code: 'LOW_VOCABULARY_OVERLAP', message: 'Словарное пересечение текстов ниже 40%.' }
      : null,
  ].filter((item): item is { type: string; code: string; message: string } => Boolean(item))
}

function normalizeSettings(settings: AnalysisSettings): AnalysisSettings {
  return {
    stop_words: {
      mode: settings.stop_words.mode,
      custom: normalizeTerms(settings.stop_words.custom),
    },
    keywords: normalizeTerms(settings.keywords),
    lemmatization: settings.lemmatization,
    ngrams: {
      sizes: Array.from(new Set(settings.ngrams.sizes.filter((size) => size === 2 || size === 3))).sort(),
    },
    spam: {
      threshold_percent: Math.max(0, Number(settings.spam.threshold_percent) || 0),
    },
  }
}

function invalidateSeo(state: MockClientState, reason: string) {
  if (state.last_results.seo) {
    state.last_results.seo = {
      ...state.last_results.seo,
      is_actual: false,
      invalidation_reason: reason,
      updated_at: new Date().toISOString(),
    }
  }
}

function invalidateCompare(state: MockClientState, reason: string) {
  if (state.last_results.compare) {
    state.last_results.compare = {
      ...state.last_results.compare,
      is_actual: false,
      invalidation_reason: reason,
      updated_at: new Date().toISOString(),
    }
  }
}

function invalidateSpelling(state: MockClientState, reason: string) {
  if (state.last_results.spelling) {
    state.last_results.spelling = {
      ...state.last_results.spelling,
      is_actual: false,
      invalidation_reason: reason,
      updated_at: new Date().toISOString(),
    }
  }
}

function buildSpellingResult(documents: DocumentItem[]): SpellingResult {
  const checkedAt = new Date().toISOString()
  const checkedDocuments = documents.map(buildSpellingDocumentResult)
  const allIssues = checkedDocuments.flatMap((document) => document.issues)
  const languages = Array.from(new Set(checkedDocuments.map((document) => document.language)))

  return {
    summary: {
      documents_count: documents.length,
      total_issues: allIssues.length,
      spelling_count: countSpellingIssues(allIssues, 'spelling'),
      grammar_count: countSpellingIssues(allIssues, 'grammar'),
      punctuation_count: countSpellingIssues(allIssues, 'punctuation'),
      style_count: countSpellingIssues(allIssues, 'style'),
      typography_count: countSpellingIssues(allIssues, 'typography'),
      other_count: countSpellingIssues(allIssues, 'other'),
      unknown_count: countSpellingIssues(allIssues, 'other'),
      languages,
      checked_at: checkedAt,
      engine: 'LanguageTool',
      max_check_time_millis: 8000,
    },
    documents: checkedDocuments,
  }
}

function buildSpellingDocumentResult(document: DocumentItem): SpellingDocumentResult {
  const language = detectMockLanguage(document.content)
  const specs: Array<{
    category: MockSpellingCategory
    message: string
    replacement: string
    rule: string
    word?: string
  }> = [
    {
      category: 'spelling',
      message: 'Проверьте написание слова',
      replacement: 'орфографические',
      rule: 'MOCK_SPELLING',
    },
    {
      category: 'grammar',
      message: 'Возможна грамматическая ошибка',
      replacement: 'грамматические',
      rule: 'MOCK_GRAMMAR',
    },
    {
      category: 'punctuation',
      message: 'Проверьте пунктуацию рядом с фрагментом',
      replacement: 'ошибки,',
      rule: 'MOCK_PUNCTUATION',
    },
    {
      category: 'style',
      message: 'Фрагмент выглядит стилистически слабым',
      replacement: 'точнее',
      rule: 'MOCK_STYLE',
    },
    {
      category: 'typography',
      message: 'Проверьте типографику и пробелы',
      replacement: '—',
      rule: 'MOCK_TYPOGRAPHY',
    },
    {
      category: 'other',
      message: 'Дополнительное замечание проверки',
      replacement: '',
      rule: 'MOCK_OTHER',
    },
  ]
  const words = document.content.match(/[A-Za-zА-Яа-яЁё]+(?:[-'][A-Za-zА-Яа-яЁё]+)*/g) ?? []
  const issues = specs
    .map((spec, index) => {
      const fallbackWord = words[index * 2] ?? words[index] ?? document.content.slice(0, 8)
      return createMockSpellingIssue(document, spec, fallbackWord, index + 1, language)
    })
    .filter((issue): issue is SpellingIssue => Boolean(issue))

  return {
    document_id: document.id,
    title: document.title,
    language,
    text_length: document.content.length,
    checked_char_count: document.content.length,
    truncated: false,
    issues_count: issues.length,
    issues,
  }
}

function createMockSpellingIssue(
  document: DocumentItem,
  spec: {
    category: MockSpellingCategory
    message: string
    replacement: string
    rule: string
    word?: string
  },
  fallbackWord: string,
  index: number,
  language: string,
): SpellingIssue | null {
  const word = spec.word || fallbackWord
  const offset = document.content.indexOf(word)

  if (offset < 0 || !word) {
    return null
  }

  return {
    id: `${document.id}-spell-${index}`,
    rule_id: spec.rule,
    message: spec.message,
    short_message: spec.message,
    category: spec.category,
    category_name: spec.category,
    severity: spec.category === 'spelling' ? 'error' : spec.category === 'style' || spec.category === 'typography' ? 'info' : 'warning',
    offset,
    length: word.length,
    context: document.content.slice(Math.max(0, offset - 30), Math.min(document.content.length, offset + word.length + 30)),
    context_offset: Math.min(30, offset),
    word,
    replacements: spec.replacement ? [spec.replacement] : [],
    sentence: document.content.slice(Math.max(0, offset - 60), Math.min(document.content.length, offset + word.length + 60)),
    language,
  }
}

function countSpellingIssues(issues: SpellingIssue[], category: SpellingCategory) {
  return issues.filter((issue) => issue.category === category).length
}

function detectMockLanguage(text: string) {
  const cyrillic = text.match(/[А-Яа-яЁё]/g)?.length ?? 0
  const latin = text.match(/[A-Za-z]/g)?.length ?? 0
  return cyrillic >= latin ? 'ru-RU' : 'en-US'
}

function requireSeoResult(browserId: string) {
  const result = getClientState(browserId).last_results.seo?.result

  if (!result) {
    throw new Error('ANALYSIS_NOT_FOUND')
  }

  return result
}

function tableToCsv(type: SeoTableExportType, result: SeoResult) {
  if (type === 'words') {
    return {
      fileName: 'seo_words.csv',
      headers: ['Слово', 'Частота', 'Плотность', 'Длина', 'Ключ'],
      rows: result.words.map((row) => [row.word, row.count, row.density, row.length, row.is_keyword ? 'да' : 'нет']),
    }
  }

  if (type === 'ngrams') {
    return {
      fileName: 'seo_ngrams.csv',
      headers: ['Фраза', 'Размер', 'Частота', 'Плотность', 'Ключ'],
      rows: result.ngrams.map((row) => [row.phrase, row.size, row.count, row.density, row.is_keyword ? 'да' : 'нет']),
    }
  }

  if (type === 'keywords') {
    return {
      fileName: 'seo_keywords.csv',
      headers: ['Ключ', 'Тип', 'Частота', 'Плотность', 'Статус'],
      rows: result.keywords.map((row) => [row.keyword, row.type, row.count, row.density, row.status]),
    }
  }

  if (type === 'spam') {
    return {
      fileName: 'seo_spam.csv',
      headers: ['Единица', 'Тип', 'Частота', 'Плотность', 'Порог', 'Статус'],
      rows: result.spam_warnings.map((row) => [row.item, row.type, row.count, row.density, row.threshold, row.status]),
    }
  }

  if (type === 'water') {
    return {
      fileName: 'seo_water.csv',
      headers: ['Показатель', 'Значение'],
      rows: [
        ['percent', result.water.percent],
        ['level', result.water.level],
        ['water_units_count', result.water.water_units_count],
        ['total_words', result.water.total_words],
        ...result.water.top_markers.map((row) => [`marker:${row.marker}`, row.count]),
      ],
    }
  }

  return {
    fileName: 'seo_mixed.csv',
    headers: ['Слово', 'Частота', 'Предложение'],
    rows: result.mixed_alphabet_words.map((row) => [row.word, row.count, row.suggestion]),
  }
}

function compareTableToCsv(type: CompareTableExportType, result: CompareAnalysisResult): {
  headers: string[]
  rows: Array<Array<string | number | boolean>>
  fileName: string
} {
  if (type === 'words') {
    return {
      headers: ['Слово', 'A частота', 'B частота', 'A плотность', 'B плотность', 'Разница частоты', 'Разница плотности'],
      rows: result.words_comparison.common.map((row) => [
        row.word,
        row.a_count,
        row.b_count,
        row.a_density ?? 0,
        row.b_density ?? 0,
        row.diff_count,
        row.diff_density ?? 0,
      ]),
      fileName: 'compare_words.csv',
    }
  }

  if (type === 'ngrams') {
    return {
      headers: ['Фраза', 'N', 'A частота', 'B частота', 'A плотность', 'B плотность', 'Разница частоты', 'Разница плотности'],
      rows: result.ngrams_comparison.common.map((row) => [
        row.phrase,
        row.n ?? '',
        row.a_count,
        row.b_count,
        row.a_density ?? 0,
        row.b_density ?? 0,
        row.diff_count,
        row.diff_density ?? 0,
      ]),
      fileName: 'compare_ngrams.csv',
    }
  }

  return {
    headers: ['Ключ', 'A найден', 'A частота', 'A плотность', 'B найден', 'B частота', 'B плотность', 'Разница частоты', 'Разница плотности', 'Статус'],
    rows: result.keywords_comparison.map((row) => [
      row.keyword,
      row.a.found ? 'да' : 'нет',
      row.a.count,
      row.a.density,
      row.b.found ? 'да' : 'нет',
      row.b.count,
      row.b.density,
      row.diff_count,
      row.diff_density,
      row.status,
    ]),
    fileName: 'compare_keywords.csv',
  }
}

function toCsv(headers: string[], rows: Array<Array<string | number | boolean>>) {
  const escape = (value: string | number | boolean) => `"${String(value).replace(/"/g, '""')}"`
  return [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n')
}

function createZipBlob(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name)
    const data = encoder.encode(file.content)
    const crc = crc32(data)
    const localHeader = createLocalFileHeader(nameBytes, data.length, crc)
    const centralHeader = createCentralDirectoryHeader(nameBytes, data.length, crc, offset)

    localParts.push(localHeader, nameBytes, data)
    centralParts.push(centralHeader, nameBytes)
    offset += localHeader.length + nameBytes.length + data.length
  })

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const endRecord = createEndOfCentralDirectory(files.length, centralSize, offset)

  return new Blob([...localParts, ...centralParts, endRecord].map(toBlobPart), {
    type: 'application/zip',
  })
}

function toBlobPart(part: Uint8Array) {
  const buffer = new ArrayBuffer(part.byteLength)
  new Uint8Array(buffer).set(part)
  return buffer
}

function createLocalFileHeader(nameBytes: Uint8Array, size: number, crc: number) {
  const header = new Uint8Array(30)
  const view = new DataView(header.buffer)

  view.setUint32(0, 0x04034b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, 0, true)
  view.setUint16(10, 0, true)
  view.setUint16(12, 0, true)
  view.setUint32(14, crc, true)
  view.setUint32(18, size, true)
  view.setUint32(22, size, true)
  view.setUint16(26, nameBytes.length, true)
  view.setUint16(28, 0, true)

  return header
}

function createCentralDirectoryHeader(
  nameBytes: Uint8Array,
  size: number,
  crc: number,
  offset: number,
) {
  const header = new Uint8Array(46)
  const view = new DataView(header.buffer)

  view.setUint32(0, 0x02014b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(6, 20, true)
  view.setUint16(8, 0, true)
  view.setUint16(10, 0, true)
  view.setUint16(12, 0, true)
  view.setUint16(14, 0, true)
  view.setUint32(16, crc, true)
  view.setUint32(20, size, true)
  view.setUint32(24, size, true)
  view.setUint16(28, nameBytes.length, true)
  view.setUint16(30, 0, true)
  view.setUint16(32, 0, true)
  view.setUint16(34, 0, true)
  view.setUint16(36, 0, true)
  view.setUint32(38, 0, true)
  view.setUint32(42, offset, true)

  return header
}

function createEndOfCentralDirectory(fileCount: number, centralSize: number, centralOffset: number) {
  const header = new Uint8Array(22)
  const view = new DataView(header.buffer)

  view.setUint32(0, 0x06054b50, true)
  view.setUint16(4, 0, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, fileCount, true)
  view.setUint16(10, fileCount, true)
  view.setUint32(12, centralSize, true)
  view.setUint32(16, centralOffset, true)
  view.setUint16(20, 0, true)

  return header
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff

  for (const byte of data) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]
  }

  return (crc ^ 0xffffffff) >>> 0
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }

  return value >>> 0
})

function getStopWords(settings: AnalysisSettings) {
  const custom = new Set(normalizeTerms(settings.stop_words.custom))

  if (settings.stop_words.mode === 'off') {
    return new Set<string>()
  }

  if (settings.stop_words.mode === 'custom') {
    return custom
  }

  if (settings.stop_words.mode === 'default_custom') {
    return new Set([...defaultStopWords, ...custom])
  }

  return defaultStopWords
}

function tokenize(text: string, normalize = true) {
  const words = text.match(/[A-Za-zА-Яа-яЁё]+(?:[-'][A-Za-zА-Яа-яЁё]+)*/g) ?? []
  return normalize ? words.map(normalizeWord) : words
}

function normalizeWord(word: string) {
  return word.trim().toLowerCase().replace(/ё/g, 'е')
}

function normalizeTerms(items: string[]) {
  return Array.from(
    new Set(
      items
        .flatMap((item) => item.split(/[\n,;]+/))
        .map((item) => item.trim().toLowerCase().replace(/ё/g, 'е'))
        .filter(Boolean),
    ),
  )
}

function countItems(items: string[]) {
  return items.reduce((counter, item) => {
    counter.set(item, (counter.get(item) ?? 0) + 1)
    return counter
  }, new Map<string, number>())
}

function countNgrams(words: string[], sizes: number[]) {
  const counter = new Map<string, number>()

  sizes.forEach((size) => {
    for (let index = 0; index <= words.length - size; index += 1) {
      const phrase = words.slice(index, index + size).join(' ')
      const key = `${size}:${phrase}`
      counter.set(key, (counter.get(key) ?? 0) + 1)
    }
  })

  return counter
}

function countWater(words: string[], text: string) {
  const counter = new Map<string, number>()

  words.forEach((word) => {
    if (defaultStopWords.has(word) || waterMarkers.has(word)) {
      counter.set(word, (counter.get(word) ?? 0) + 1)
    }
  })

  const normalizedText = normalizeWord(text)
  waterMarkers.forEach((marker) => {
    if (!marker.includes(' ')) {
      return
    }

    const count = normalizedText.split(marker).length - 1
    if (count > 0) {
      counter.set(marker, (counter.get(marker) ?? 0) + count)
    }
  })

  return counter
}

function buildStructure(text: string): SeoStructure {
  const wordsCount = tokenize(text).length

  if (wordsCount === 0) {
    return {
      paragraphs_count: 0,
      sentences_count: 0,
      words_count: 0,
      avg_words_per_paragraph: 0,
      avg_words_per_sentence: 0,
      paragraphs: [],
    }
  }

  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  const safeParagraphs = paragraphs.length ? paragraphs : [text.trim()]
  const sentences = splitSentences(text)
  const sentencesCount = sentences.length || 1

  return {
    paragraphs_count: safeParagraphs.length,
    sentences_count: sentencesCount,
    words_count: wordsCount,
    avg_words_per_paragraph: round(wordsCount / safeParagraphs.length),
    avg_words_per_sentence: round(wordsCount / sentencesCount),
    paragraphs: safeParagraphs.map((paragraph, index) => {
      const paragraphWords = tokenize(paragraph).length
      const paragraphSentences = splitSentences(paragraph).length || (paragraphWords > 0 ? 1 : 0)

      return {
        index: index + 1,
        words_count: paragraphWords,
        sentences_count: paragraphSentences,
        percent_of_text: round(paragraphWords / wordsCount * 100),
        preview: paragraph.replace(/\s+/g, ' ').slice(0, 160),
      }
    }),
  }
}

function splitSentences(text: string) {
  return text
    .split(/[.!?;]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => tokenize(sentence).length > 0)
}

function hasMixedAlphabet(word: string) {
  return /[A-Za-z]/.test(word) && /[А-Яа-яЁё]/.test(word)
}

function suggestMixedWord(word: string) {
  return word
    .split('')
    .map((letter) => mixedMap[letter] ?? letter)
    .join('')
}

function getKeywordStatus(count: number, density: number, threshold: number) {
  if (count === 0) {
    return 'missing'
  }

  if (density >= threshold) {
    return 'spam'
  }

  if (density >= threshold * 0.7) {
    return 'high'
  }

  if (density < 0.3) {
    return 'low'
  }

  return 'normal'
}

function buildRecommendations(
  keywords: SeoKeywordRow[],
  spamWarnings: SeoSpamWarning[],
  waterPercent: number,
  mixedCount: number,
) {
  const recommendations = [
    ...keywords
      .filter((keyword) => keyword.status === 'missing')
      .map((keyword) => `Добавьте ключ «${keyword.keyword}» в текст или заголовки.`),
    ...keywords
      .filter((keyword) => keyword.status === 'high' || keyword.status === 'spam')
      .map((keyword) => `Снизьте плотность ключа «${keyword.keyword}»: сейчас ${keyword.density}%.`),
    ...spamWarnings
      .slice(0, 3)
      .map((warning) => `Единица «${warning.item}» превышает порог переспама.`),
  ]

  if (waterPercent > 45) {
    recommendations.push('Снизьте водность: уберите вводные обороты и слабые служебные слова.')
  }

  if (mixedCount > 0) {
    recommendations.push('Проверьте слова со смешанной кириллицей и латиницей.')
  }

  return recommendations.length
    ? recommendations
    : ['Критичных проблем не найдено. Проверьте структуру текста перед публикацией.']
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

function hashText(value: string) {
  return value.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function wait() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY)
  })
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}
