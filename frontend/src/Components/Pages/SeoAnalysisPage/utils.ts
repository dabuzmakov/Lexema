import { formatPercent } from '../../../Utils/lexema'
import type { SeoKeywordRow, SeoNgramRow, SeoResult, SeoWordRow } from '../../../Models/analysis'
import type { AnalysisSettings } from '../../../Models/settings'
import type { ChartRow, DetailChartRow, DetailKind, DetailOrder, DetailTopN, HighlightKind } from './types'

export function translateRisk(level: string) {
  if (level === 'high') {
    return 'Высокий'
  }
  if (level === 'medium') {
    return 'Средний'
  }
  return 'Низкий'
}

export function normalizeTerm(value: string) {
  return value.trim().toLowerCase().replace(/ё/g, 'е')
}

export function buildHighlightSets(result: SeoResult, settings: AnalysisSettings) {
  const keywords = new Set<string>()
  const keywordPhrases: string[][] = []

  result.keywords.forEach((row) => {
    const words = termToWords(row.keyword)

    words.forEach((word) => keywords.add(word))
    if (words.length > 1) {
      keywordPhrases.push(words)
    }
  })

  const stop = new Set<string>()
  if (settings.stop_words.mode === 'default' || settings.stop_words.mode === 'default_custom') {
    result.lexicon?.stop_words.forEach((word) => stop.add(normalizeTerm(word)))
  }
  if (settings.stop_words.mode === 'custom' || settings.stop_words.mode === 'default_custom') {
    settings.stop_words.custom.forEach((word) => stop.add(normalizeTerm(word)))
  }

  const water = new Set<string>()
  const waterPhrases: string[][] = []
  const waterMarkerRows = result.water.markers ?? result.water.top_markers

  waterMarkerRows.forEach((row) => {
    const words = termToWords(row.marker)

    if (words.length === 1) {
      water.add(words[0])
    } else if (words.length > 1) {
      waterPhrases.push(words)
    }
  })

  const mixed = new Set(result.mixed_alphabet_words.map((row) => normalizeTerm(row.word)))

  return {
    keywords,
    keywordPhrases: sortPhrasesByLength(keywordPhrases),
    mixed,
    stop,
    water,
    waterPhrases: sortPhrasesByLength(waterPhrases),
  }
}

type HighlightSets = ReturnType<typeof buildHighlightSets>

export function buildPartHighlights(
  parts: string[],
  sets: HighlightSets,
  enabled: Record<HighlightKind, boolean>,
) {
  const highlights = new Map<number, Exclude<HighlightKind, 'mixed'>>()
  const wordIndexes = parts
    .map((part, index) => ({ index, normalized: normalizeTerm(part) }))
    .filter(({ normalized }) => /^[\p{L}]+(?:[-'][\p{L}]+)*$/u.test(normalized))

  if (enabled.keywords) {
    applyPhraseHighlights(highlights, wordIndexes, sets.keywordPhrases, 'keywords')
  }
  if (enabled.water) {
    applyPhraseHighlights(highlights, wordIndexes, sets.waterPhrases, 'water')
  }

  wordIndexes.forEach(({ index, normalized }) => {
    if (highlights.has(index)) {
      return
    }

    if (enabled.keywords && sets.keywords.has(normalized)) {
      highlights.set(index, 'keywords')
    } else if (enabled.water && sets.water.has(normalized)) {
      highlights.set(index, 'water')
    } else if (enabled.stop && sets.stop.has(normalized)) {
      highlights.set(index, 'stop')
    }
  })

  return highlights
}

function termToWords(value: string) {
  return normalizeTerm(value).match(/[\p{L}]+(?:[-'][\p{L}]+)*/gu) ?? []
}

function sortPhrasesByLength(phrases: string[][]) {
  return phrases.sort((first, second) => second.length - first.length)
}

function applyPhraseHighlights(
  highlights: Map<number, Exclude<HighlightKind, 'mixed'>>,
  wordIndexes: Array<{ index: number; normalized: string }>,
  phrases: string[][],
  kind: Exclude<HighlightKind, 'mixed'>,
) {
  phrases.forEach((phrase) => {
    for (let position = 0; position <= wordIndexes.length - phrase.length; position += 1) {
      const matches = phrase.every((word, offset) => wordIndexes[position + offset]?.normalized === word)

      if (matches) {
        phrase.forEach((_, offset) => {
          const partIndex = wordIndexes[position + offset]?.index

          if (partIndex !== undefined && !highlights.has(partIndex)) {
            highlights.set(partIndex, kind)
          }
        })
      }
    }
  })
}

export function wordRowsToDisplay(rows: SeoWordRow[]): ChartRow[] {
  return rows.map((row) => ({
    label: row.word,
    value: row.count,
    meta: formatPercent(row.density),
  }))
}

export function wordsToChartRows(rows: SeoWordRow[]): ChartRow[] {
  return wordRowsToDisplay(rows)
}

export function ngramRowsToDisplay(rows: SeoNgramRow[]): ChartRow[] {
  return rows.map((row) => ({
    label: row.phrase,
    value: row.count,
    meta: formatPercent(row.density),
  }))
}

export function ngramRowsToChartRows(rows: SeoNgramRow[]): ChartRow[] {
  return ngramRowsToDisplay(rows)
}

export function keywordRowsToChartRows(rows: SeoKeywordRow[]): ChartRow[] {
  return rows.map((row) => ({
    label: row.keyword,
    value: row.count,
    meta: row.count > 0 ? 'В тексте' : 'Не найдено',
  }))
}

export function getDetailConfig(detail: DetailKind) {
  const configs: Record<DetailKind, { title: string; description: string }> = {
    keywords: {
      title: 'Ключевые слова и фразы',
      description: 'Расширенный частотный чарт по всем элементам',
    },
    ngrams: {
      title: 'Топ N-грамм',
      description: 'Расширенный частотный чарт по всем элементам',
    },
    words: {
      title: 'Топ слов',
      description: 'Расширенный частотный чарт по всем элементам',
    },
  }

  return configs[detail]
}

export function getDetailChartRows(
  detail: DetailKind,
  result: SeoResult,
  filters: { minLength: number; order: DetailOrder; topN: DetailTopN },
): DetailChartRow[] {
  const limitRows = (rows: DetailChartRow[]) => filters.topN === 'all' ? rows : rows.slice(0, filters.topN)

  if (detail === 'words') {
    return limitRows(sortDetailRows(
      result.words
        .filter((row) => row.word.length >= filters.minLength)
        .map((row) => ({ label: row.word, count: row.count, density: row.density })),
      filters.order,
    ))
  }

  if (detail === 'ngrams') {
    return limitRows(sortDetailRows(
      result.ngrams
        .filter((row) => row.phrase.length >= filters.minLength)
        .map((row) => ({ label: row.phrase, count: row.count, density: row.density })),
      filters.order,
    ))
  }

  return limitRows(sortDetailRows(
    result.keywords
      .filter((row) => row.keyword.length >= filters.minLength)
      .map((row) => ({ label: row.keyword, count: row.count, density: row.density, status: row.status })),
    filters.order,
  ))
}

export function detailRowsToChartRows(rows: DetailChartRow[]): ChartRow[] {
  return rows.map((row) => ({
    label: row.label,
    value: row.count,
    meta: formatPercent(row.density),
  }))
}

export function detailMarkdownHeaders(detail: DetailKind) {
  return detail === 'keywords'
    ? ['Фраза', 'Частота', 'Плотность', 'Статус']
    : ['Фраза', 'Частота', 'Плотность']
}

export function detailRowsToMarkdown(detail: DetailKind, rows: DetailChartRow[]): Array<Array<string | number>> {
  return rows.map((row) => detail === 'keywords'
    ? [row.label, row.count, formatPercent(row.density), keywordStatusLabel(row)]
    : [row.label, row.count, formatPercent(row.density)])
}

export function keywordStatusLabel(row: DetailChartRow) {
  if (row.count > 0) {
    return 'В тексте'
  }

  return 'Не найдено'
}

export function copyMarkdownTable(title: string, headers: string[], rows: Array<Array<string | number>>) {
  const table = [
    `### ${title}`,
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n')

  void navigator.clipboard?.writeText(table)
}

export function downloadChartPng(title: string, rows: ChartRow[]) {
  const canvas = window.document.createElement('canvas')
  const visibleRows = rows.slice(0, 24)
  const width = 1440
  const rowHeight = 52
  const headerY = 184
  const chartTop = 222
  const chartBottom = 84
  const height = Math.max(760, chartTop + Math.max(visibleRows.length, 1) * rowHeight + chartBottom)
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(width * pixelRatio)
  canvas.height = Math.round(height * pixelRatio)
  const context = canvas.getContext('2d')

  if (!context) {
    return
  }

  context.scale(pixelRatio, pixelRatio)
  context.fillStyle = '#f7faf9'
  context.fillRect(0, 0, width, height)

  drawExportCard(context, 44, 38, width - 88, height - 76, 28)

  context.fillStyle = '#0f172a'
  context.font = '700 40px Inter, Arial, sans-serif'
  context.fillText(truncateCanvasText(context, title, width - 210), 82, 104)

  context.fillStyle = '#64748b'
  context.font = '500 19px Inter, Arial, sans-serif'
  const rowCountLabel = rows.length === visibleRows.length ? `${visibleRows.length} строк` : `${visibleRows.length} из ${rows.length} строк`
  context.fillText(rowCountLabel, 84, 138)

  context.strokeStyle = '#e2e8f0'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(82, 158)
  context.lineTo(width - 82, 158)
  context.stroke()

  if (visibleRows.length === 0) {
    context.fillStyle = '#64748b'
    context.font = '600 24px Inter, Arial, sans-serif'
    context.textAlign = 'center'
    context.fillText('Нет данных для графика', width / 2, height / 2)
    context.textAlign = 'left'
    saveCanvasPng(canvas, title)
    return
  }

  const labelX = 86
  const barX = 530
  const barWidth = 580
  const valueX = width - 92
  const max = Math.max(1, ...visibleRows.map((row) => row.value))

  context.fillStyle = '#64748b'
  context.font = '700 15px Inter, Arial, sans-serif'
  context.fillText('Показатель', labelX, headerY)
  context.fillText('Значение', barX + 2, headerY)
  context.textAlign = 'right'
  context.fillText('Итог', valueX, headerY)
  context.textAlign = 'left'

  context.strokeStyle = '#e2e8f0'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(labelX, headerY + 18)
  context.lineTo(valueX, headerY + 18)
  context.stroke()

  visibleRows.forEach((row, index) => {
    const y = chartTop + index * rowHeight
    const lineY = y + rowHeight - 8
    const value = Math.max(0, row.value)
    const filledWidth = value === 0 ? 0 : Math.max(8, (value / max) * barWidth)
    const valueLabel = `${formatChartValue(row.value)}${row.meta ? ` · ${row.meta}` : ''}`

    if (index > 0) {
      context.strokeStyle = '#eef2f7'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(labelX, y - 8)
      context.lineTo(valueX, y - 8)
      context.stroke()
    }

    context.fillStyle = '#111827'
    context.font = '650 20px Inter, Arial, sans-serif'
    context.fillText(truncateCanvasText(context, row.label, barX - labelX - 56), labelX, y + 22)

    fillRoundRect(context, barX, y + 4, barWidth, 16, 999, '#e8eef3')

    if (filledWidth > 0) {
      const gradient = context.createLinearGradient(barX, 0, barX + barWidth, 0)
      gradient.addColorStop(0, '#10b981')
      gradient.addColorStop(1, '#22c55e')
      fillRoundRect(context, barX, y + 4, filledWidth, 16, 999, gradient)
    }

    context.fillStyle = '#334155'
    context.font = '600 18px Inter, Arial, sans-serif'
    context.textAlign = 'right'
    context.fillText(truncateCanvasText(context, valueLabel, 250), valueX, y + 22)
    context.textAlign = 'left'

    if (index === visibleRows.length - 1) {
      context.strokeStyle = '#eef2f7'
      context.beginPath()
      context.moveTo(labelX, lineY)
      context.lineTo(valueX, lineY)
      context.stroke()
    }
  })

  context.fillStyle = '#94a3b8'
  context.font = '500 15px Inter, Arial, sans-serif'
  context.fillText('LEXEMA', 84, height - 54)

  saveCanvasPng(canvas, title)
}

function drawExportCard(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.save()
  context.shadowColor = 'rgba(15, 23, 42, 0.10)'
  context.shadowBlur = 28
  context.shadowOffsetY = 14
  fillRoundRect(context, x, y, width, height, radius, '#ffffff')
  context.restore()

  context.strokeStyle = '#e2e8f0'
  context.lineWidth = 1
  strokeRoundRect(context, x + 0.5, y + 0.5, width - 1, height - 1, radius)
}

function fillRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasGradient,
) {
  context.beginPath()
  roundedRectPath(context, x, y, width, height, radius)
  context.fillStyle = fillStyle
  context.fill()
}

function strokeRoundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  roundedRectPath(context, x, y, width, height, radius)
  context.stroke()
}

function roundedRectPath(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2)

  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
}

function truncateCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) {
    return text
  }

  const ellipsis = '...'
  let left = 0
  let right = text.length

  while (left < right) {
    const middle = Math.ceil((left + right) / 2)
    const candidate = `${text.slice(0, middle)}${ellipsis}`

    if (context.measureText(candidate).width <= maxWidth) {
      left = middle
    } else {
      right = middle - 1
    }
  }

  return `${text.slice(0, left)}${ellipsis}`
}

function formatChartValue(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)
}

function saveCanvasPng(canvas: HTMLCanvasElement, title: string) {
  const link = window.document.createElement('a')
  link.download = `${sanitizeFilename(title)}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'chart'
}

function sortDetailRows<T extends DetailChartRow>(rows: T[], order: DetailOrder) {
  return [...rows].sort((left, right) => {
    if (order === 'count_asc') {
      return left.count - right.count
    }
    return right.count - left.count
  })
}
