import { formatNumber, formatPercent } from '../../../Utils/lexema'
import type { CompareMetricDiff } from '../../../Models/analysis'
import type { AnalysisSettings } from '../../../Models/settings'

export function formatSignedNumber(value?: number | null, suffix = '') {
  const number = Number(value ?? 0)
  const sign = number > 0 ? '+' : ''
  return `${sign}${formatNumber(round(number))}${suffix}`
}

export function formatMetricValue(value: CompareMetricDiff['a'], suffix = '') {
  if (value === null || value === undefined) {
    return '—'
  }

  if (typeof value === 'number') {
    return suffix === '%' ? formatPercent(value) : `${formatNumber(round(value))}${suffix}`
  }

  return String(value)
}

export function metricTone(value?: number | string | null) {
  const number = Number(value ?? 0)
  if (number > 0) {
    return 'positive'
  }
  if (number < 0) {
    return 'negative'
  }
  return 'neutral'
}

export function round(value: number) {
  return Math.round(value * 100) / 100
}

export function stopWordsModeLabel(mode: AnalysisSettings['stop_words']['mode']) {
  if (mode === 'off') {
    return 'Откл.'
  }
  if (mode === 'custom') {
    return 'Свои'
  }
  if (mode === 'default_custom') {
    return 'Все'
  }
  return 'Базовые'
}

export function keywordStatusLabel(status: string) {
  if (status === 'same') {
    return 'Одинаково'
  }
  if (status === 'missing_in_a') {
    return 'Нет в A'
  }
  if (status === 'missing_in_b') {
    return 'Нет в B'
  }
  if (status === 'higher_in_a') {
    return 'Выше в A'
  }
  if (status === 'higher_in_b') {
    return 'Выше в B'
  }
  if (status === 'lower_in_a') {
    return 'Ниже в A'
  }
  if (status === 'lower_in_b') {
    return 'Ниже в B'
  }
  return status || '—'
}

export function riskLabel(value?: string | null) {
  if (value === 'high') {
    return 'Высокий'
  }
  if (value === 'medium') {
    return 'Средний'
  }
  if (value === 'low') {
    return 'Низкий'
  }
  return value || '—'
}

export function isAnalysisSettings(value: unknown): value is AnalysisSettings {
  const settings = value as Partial<AnalysisSettings> | null
  return Boolean(
    settings
      && settings.stop_words
      && settings.ngrams
      && settings.spam
      && Array.isArray(settings.keywords),
  )
}
