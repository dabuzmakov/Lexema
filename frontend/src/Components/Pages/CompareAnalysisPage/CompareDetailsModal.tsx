import { BarChart3, Check, ChevronRight, Hash, KeyRound, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import appStyles from '../../../App/Styles.module.scss'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { formatNumber, formatPercent } from '../../../Utils/lexema'
import type { CompareAnalysisResult, CompareTableExportType } from '../../../Models/analysis'
import { ChartActions } from '../SeoAnalysisPage/ChartActions'
import { CustomScrollArea } from '../SeoAnalysisPage/CustomScrollArea'
import { EmptyPlaceholder } from '../SeoAnalysisPage/EmptyPlaceholder'
import { PNG_EXPORT_ROW_LIMIT } from '../SeoAnalysisPage/constants'
import { copyMarkdownTable, downloadChartPng } from '../SeoAnalysisPage/utils'
import styles from './Styles.module.scss'
import { formatSignedNumber, keywordStatusLabel, metricTone } from './utils'

type CompareDetailKind = CompareTableExportType
type CompareDetailOrder = 'total_desc' | 'total_asc' | 'diff_desc' | 'diff_asc' | 'a_desc' | 'b_desc'
type CompareDetailTopN = number | 'all'

interface CompareDetailRow {
  label: string
  n?: number
  aCount: number
  bCount: number
  aDensity: number
  bDensity: number
  diffCount: number
  diffDensity: number
  status?: string
}

const detailConfig: Record<CompareDetailKind, { title: string }> = {
  words: {
    title: 'Общие слова',
  },
  ngrams: {
    title: 'Общие N-граммы',
  },
  keywords: {
    title: 'Ключевые слова',
  },
}

export function CompareDetailsModal({
  detail,
  isExporting,
  onClose,
  onCsvExport,
  result,
}: {
  detail: CompareDetailKind
  isExporting: boolean
  onClose: () => void
  onCsvExport: (type: CompareTableExportType) => void
  result: CompareAnalysisResult
}) {
  useLockBodyScroll()

  const [topN, setTopN] = useState<CompareDetailTopN>(20)
  const numericTopN = topN === 'all' ? '' : String(topN)
  const [minLength, setMinLength] = useState(1)
  const [order, setOrder] = useState<CompareDetailOrder>('total_desc')
  const [isOrderOpen, setIsOrderOpen] = useState(false)
  const [copyNotice, setCopyNotice] = useState(false)
  const config = detailConfig[detail]
  const DetailIcon = detail === 'ngrams' ? Hash : detail === 'keywords' ? KeyRound : BarChart3
  const orderOptions: Array<{ label: string; value: CompareDetailOrder }> = [
    { label: 'Сумма ↓', value: 'total_desc' },
    { label: 'Сумма ↑', value: 'total_asc' },
    { label: 'Разница ↓', value: 'diff_desc' },
    { label: 'Разница ↑', value: 'diff_asc' },
    { label: 'Текст A ↓', value: 'a_desc' },
    { label: 'Текст B ↓', value: 'b_desc' },
  ]
  const orderLabel = orderOptions.find((option) => option.value === order)?.label ?? orderOptions[0].label
  const rows = useMemo(
    () => getSortedCompareDetailRows(getCompareDetailRows(detail, result), { minLength, order, topN }),
    [detail, minLength, order, result, topN],
  )

  function handleMarkdownCopy() {
    copyMarkdownTable(config.title, markdownHeaders(detail), markdownRows(detail, rows))
    setCopyNotice(true)
    window.setTimeout(() => setCopyNotice(false), 950)
  }

  return (
    <div className={appStyles.detailOverlay} role="dialog" aria-modal="true">
      <section className={appStyles.detailModal}>
        <div className={appStyles.detailHeader}>
          <div className={appStyles.detailHeaderContent}>
            <div className={appStyles.detailHeaderTop}>
              <h2>
                <DetailIcon size={20} />
                <span>{config.title}</span>
              </h2>
              <button aria-label="Закрыть" type="button" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className={`${appStyles.detailToolbar} ${styles.compareDetailToolbar}`}>
          <div className={`${appStyles.detailFilters} ${styles.compareDetailFilters}`}>
            <label className={appStyles.detailNumberControl}>
              <span>Top N</span>
              <input
                min={1}
                placeholder={topN === 'all' ? 'Все' : undefined}
                type="number"
                value={numericTopN}
                onChange={(event) => setTopN(Math.max(1, Number(event.target.value) || 1))}
              />
            </label>
            <button
              className={topN === 'all' ? appStyles.detailAllButtonActive : appStyles.detailAllButton}
              type="button"
              onClick={() => setTopN('all')}
            >
              Все
            </button>

            <label className={appStyles.detailNumberControl}>
              <span>Мин. длина</span>
              <input
                min={0}
                type="number"
                value={minLength}
                onChange={(event) => setMinLength(Math.max(0, Number(event.target.value) || 0))}
              />
            </label>

            <div className={appStyles.detailControlGroup}>
              <span>Сортировка</span>
              <div className={appStyles.detailDropdown}>
                <button
                  aria-expanded={isOrderOpen}
                  aria-haspopup="listbox"
                  className={appStyles.detailDropdownButton}
                  type="button"
                  onClick={() => setIsOrderOpen((value) => !value)}
                >
                  <span>{orderLabel}</span>
                  <ChevronRight size={15} />
                </button>
                {isOrderOpen ? (
                  <div className={appStyles.detailDropdownMenu} role="listbox">
                    {orderOptions.map((option) => (
                      <button
                        aria-selected={order === option.value}
                        className={order === option.value ? appStyles.detailDropdownActive : ''}
                        key={option.value}
                        role="option"
                        type="button"
                        onClick={() => {
                          setOrder(option.value)
                          setIsOrderOpen(false)
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.compareDetailLegend}>
            <span><i className={styles.compareDetailLegendA} />Текст A</span>
            <span><i className={styles.compareDetailLegendB} />Текст B</span>
          </div>

          <div className={appStyles.detailActionBar}>
            {copyNotice ? (
              <span className={`${appStyles.detailCopyNotice} ${appStyles.copyFeedback}`} role="status">
                <Check size={14} />
                <span>Скопировано</span>
              </span>
            ) : null}
            <ChartActions
              disabled={isExporting}
              onCsv={() => onCsvExport(detail)}
              onMarkdown={handleMarkdownCopy}
              onPng={() => downloadChartPng(config.title, rowsToChartRows(rows).slice(0, PNG_EXPORT_ROW_LIMIT))}
            />
          </div>
        </div>

        <CustomScrollArea className={`${appStyles.detailChart} ${styles.compareDetailChart}`}>
          <CompareDetailRows rows={rows} showStatus={detail === 'keywords'} />
        </CustomScrollArea>
      </section>
    </div>
  )
}

export function getCompareDetailRows(detail: CompareDetailKind, result: CompareAnalysisResult): CompareDetailRow[] {
  if (detail === 'words') {
    return result.words_comparison.common.map((row) => ({
      label: row.word,
      aCount: row.a_count,
      bCount: row.b_count,
      aDensity: row.a_density ?? 0,
      bDensity: row.b_density ?? 0,
      diffCount: row.diff_count,
      diffDensity: row.diff_density ?? 0,
    }))
  }

  if (detail === 'ngrams') {
    return result.ngrams_comparison.common.map((row) => ({
      label: row.phrase,
      n: row.n,
      aCount: row.a_count,
      bCount: row.b_count,
      aDensity: row.a_density ?? 0,
      bDensity: row.b_density ?? 0,
      diffCount: row.diff_count,
      diffDensity: row.diff_density ?? 0,
    }))
  }

  return result.keywords_comparison.map((row) => ({
    label: row.keyword,
    aCount: row.a.count,
    bCount: row.b.count,
    aDensity: row.a.density,
    bDensity: row.b.density,
    diffCount: row.diff_count,
    diffDensity: row.diff_density,
    status: row.status,
  }))
}

function getSortedCompareDetailRows(
  rows: CompareDetailRow[],
  { minLength, order, topN }: { minLength: number; order: CompareDetailOrder; topN: CompareDetailTopN },
) {
  const filteredRows = rows.filter((row) => row.label.length >= minLength)
  const sortedRows = [...filteredRows].sort((left, right) => {
    const leftTotal = left.aCount + left.bCount
    const rightTotal = right.aCount + right.bCount

    if (order === 'total_asc') {
      return leftTotal - rightTotal || left.label.localeCompare(right.label, 'ru')
    }

    if (order === 'diff_desc') {
      return right.diffCount - left.diffCount || rightTotal - leftTotal
    }

    if (order === 'diff_asc') {
      return left.diffCount - right.diffCount || rightTotal - leftTotal
    }

    if (order === 'a_desc') {
      return right.aCount - left.aCount || rightTotal - leftTotal
    }

    if (order === 'b_desc') {
      return right.bCount - left.bCount || rightTotal - leftTotal
    }

    return rightTotal - leftTotal || left.label.localeCompare(right.label, 'ru')
  })

  return topN === 'all' ? sortedRows : sortedRows.slice(0, topN)
}

export function copyCompareMarkdown(title: string, detail: CompareDetailKind, rows: CompareDetailRow[]) {
  copyMarkdownTable(title, markdownHeaders(detail), markdownRows(detail, rows))
}

export function rowsToChartRows(rows: CompareDetailRow[]) {
  return rows.map((row) => ({
    label: row.label,
    value: row.aCount + row.bCount,
    meta: `A: ${formatNumber(row.aCount)} · B: ${formatNumber(row.bCount)}`,
  }))
}

function CompareDetailRows({ rows, showStatus }: { rows: CompareDetailRow[]; showStatus: boolean }) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.aCount, row.bCount]))

  if (rows.length === 0) {
    return (
      <div className={appStyles.detailChartEmpty}>
        <EmptyPlaceholder fill />
      </div>
    )
  }

  return (
    <div className={styles.compareDetailRows}>
      {rows.map((row) => (
        <div className={styles.compareDetailRow} key={`${row.label}-${row.n ?? ''}`}>
          <div className={styles.compareDetailTop}>
            <div className={styles.compareDetailTerm}>
              <b title={row.label}>{row.label}</b>
            </div>
            <div className={`${styles.compareDetailDiff} ${styles.compareTermDiff} ${styles[`tone_${metricTone(row.diffCount)}`]}`}>
              <b>{formatSignedNumber(row.diffCount)}</b>
              <small>{formatSignedNumber(row.diffDensity, '%')}</small>
              {showStatus ? <em className={`${appStyles.keywordStatus} ${styles[`status_${row.status}`] ?? ''}`}>{keywordStatusLabel(row.status ?? '')}</em> : null}
            </div>
          </div>
          <div className={styles.compareDetailBars}>
            <div className={styles.compareDetailBarLine}>
              <span>A</span>
              <i className={styles.compareDetailBarA} style={{ width: `${Math.max(3, row.aCount / max * 100)}%` }} />
              <b>{formatNumber(row.aCount)}</b>
              <small>{formatPercent(row.aDensity)}</small>
            </div>
            <div className={styles.compareDetailBarLine}>
              <span>B</span>
              <i className={styles.compareDetailBarB} style={{ width: `${Math.max(3, row.bCount / max * 100)}%` }} />
              <b>{formatNumber(row.bCount)}</b>
              <small>{formatPercent(row.bDensity)}</small>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function markdownHeaders(detail: CompareDetailKind) {
  return detail === 'ngrams'
    ? ['Фраза', 'N', 'A частота', 'B частота', 'A плотность', 'B плотность', 'Δ частоты', 'Δ плотности']
    : detail === 'keywords'
    ? ['Ключ', 'A частота', 'B частота', 'A плотность', 'B плотность', 'Δ частоты', 'Δ плотности', 'Статус']
    : ['Слово', 'A частота', 'B частота', 'A плотность', 'B плотность', 'Δ частоты', 'Δ плотности']
}

function markdownRows(detail: CompareDetailKind, rows: CompareDetailRow[]): Array<Array<string | number>> {
  return rows.map((row) => {
    const base = [
      row.label,
      row.aCount,
      row.bCount,
      formatPercent(row.aDensity),
      formatPercent(row.bDensity),
      row.diffCount,
      formatPercent(row.diffDensity),
    ]

    if (detail === 'ngrams') {
      return [row.label, row.n ?? '', ...base.slice(1)]
    }

    if (detail === 'keywords') {
      return [...base, keywordStatusLabel(row.status ?? '')]
    }

    return base
  })
}
