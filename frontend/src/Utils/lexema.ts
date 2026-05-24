import type { LastAnalysisResult } from '../Models/analysis'
import { DEFAULT_ANALYSIS_SETTINGS, type AnalysisSettings } from '../Models/settings'
import type { DisplaySettings, WordSort } from '../Models/ui'
import {
  BROWSER_ID_STORAGE_KEY,
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_SETTINGS_STORAGE_KEY,
  WORD_SORT_VALUES,
  WORDS_PER_TEXT_PAGE,
} from './lexemaConstants'

export function getOrCreateBrowserId() {
  const stored = window.localStorage.getItem(BROWSER_ID_STORAGE_KEY)

  if (stored) {
    return stored
  }

  const nextId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  window.localStorage.setItem(BROWSER_ID_STORAGE_KEY, nextId)
  return nextId
}

export function splitTextarea(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function textFromList(items: string[]) {
  return items.join(', ')
}

export function normalizeDisplaySettings(settings: Partial<DisplaySettings>): DisplaySettings {
  const sort = settings.sort && WORD_SORT_VALUES.includes(settings.sort as WordSort)
    ? settings.sort
    : DEFAULT_DISPLAY_SETTINGS.sort

  return {
    topN: Math.max(1, Math.min(500, Number(settings.topN) || DEFAULT_DISPLAY_SETTINGS.topN)),
    minLength: Math.max(1, Math.min(30, Number(settings.minLength) || DEFAULT_DISPLAY_SETTINGS.minLength)),
    sort,
  }
}

export function normalizeAnalysisSettings(
  settings: AnalysisSettings,
  options: { migrateDefaultThreshold?: boolean } = {},
): AnalysisSettings {
  const threshold = Number(settings.spam.threshold_percent)
  const thresholdPercent = Number.isFinite(threshold)
    ? options.migrateDefaultThreshold && threshold === 50
      ? DEFAULT_ANALYSIS_SETTINGS.spam.threshold_percent
      : Math.max(0, threshold)
    : DEFAULT_ANALYSIS_SETTINGS.spam.threshold_percent

  return {
    ...settings,
    spam: {
      ...settings.spam,
      threshold_percent: thresholdPercent,
    },
  }
}

export function getStoredDisplaySettings() {
  try {
    const stored = window.localStorage.getItem(DISPLAY_SETTINGS_STORAGE_KEY)

    if (!stored) {
      return DEFAULT_DISPLAY_SETTINGS
    }

    return normalizeDisplaySettings(JSON.parse(stored) as Partial<DisplaySettings>)
  } catch {
    return DEFAULT_DISPLAY_SETTINGS
  }
}

export function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat('ru-RU').format(value ?? 0)
}

export function pluralizeRu(value: number | undefined, forms: [string, string, string]) {
  const number = Math.abs(Math.round(Number(value ?? 0)))
  const lastTwo = number % 100
  const last = number % 10

  if (lastTwo >= 11 && lastTwo <= 14) {
    return forms[2]
  }
  if (last === 1) {
    return forms[0]
  }
  if (last >= 2 && last <= 4) {
    return forms[1]
  }
  return forms[2]
}

export function formatCount(value: number | undefined, forms: [string, string, string]) {
  return `${formatNumber(value)} ${pluralizeRu(value, forms)}`
}

export function formatPercent(value: number | undefined) {
  return `${(value ?? 0).toLocaleString('ru-RU', {
    maximumFractionDigits: 2,
  })}%`
}

export function formatDate(value?: string | null) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  const part = (input: number) => input.toString().padStart(2, '0')

  return `${part(date.getDate())}.${part(date.getMonth() + 1)}.${part(date.getFullYear() % 100)} ${part(date.getHours())}:${part(date.getMinutes())}`
}

export function formatApproxPages(words: number) {
  if (words <= 0) {
    return '≈ 0 стр.'
  }

  return `≈ ${formatNumber(Math.max(1, Math.ceil(words / WORDS_PER_TEXT_PAGE)))} стр.`
}

export function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function sanitizeDocumentTitle(fileName: string) {
  return fileName.replace(/\.txt$/i, '').trim() || fileName
}

export function createMarkdownTable(headers: string[], rows: Array<Array<string | number>>) {
  const headerRow = `| ${headers.join(' | ')} |`
  const separator = `| ${headers.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n')
  return [headerRow, separator, body].filter(Boolean).join('\n')
}

export function markSeoStale<T>(
  current: LastAnalysisResult<T> | null,
  reason: string,
): LastAnalysisResult<T> | null {
  if (!current) {
    return current
  }

  return {
    ...current,
    is_actual: false,
    invalidation_reason: reason,
  }
}
