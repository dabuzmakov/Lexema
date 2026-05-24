import { BarChart3, Check, ChevronRight, Hash, KeyRound, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import styles from '../../../../App/Styles.module.scss'
import { useLockBodyScroll } from '../../../../Hooks/useLockBodyScroll'
import { formatNumber, formatPercent } from '../../../../Utils/lexema'
import type { SeoResult, SeoTableExportType } from '../../../../Models/analysis'
import { PNG_EXPORT_ROW_LIMIT } from '../constants'
import { ChartActions } from '../ChartActions'
import { CustomScrollArea } from '../CustomScrollArea'
import { EmptyPlaceholder } from '../EmptyPlaceholder'
import {
  copyMarkdownTable,
  detailMarkdownHeaders,
  detailRowsToChartRows,
  detailRowsToMarkdown,
  downloadChartPng,
  getDetailChartRows,
  getDetailConfig,
  keywordStatusLabel,
} from '../utils'
import type { DetailChartRow, DetailKind, DetailOrder, DetailTopN } from '../types'

export function ChartDetailsModal({
  detail,
  isExporting,
  onClose,
  onCsvExport,
  result,
}: {
  detail: DetailKind
  isExporting: boolean
  onClose: () => void
  onCsvExport: (type: SeoTableExportType) => void
  result: SeoResult
}) {
  useLockBodyScroll()

  const [topN, setTopN] = useState<DetailTopN>(20)
  const numericTopN = topN === 'all' ? '' : String(topN)
  const [minLength, setMinLength] = useState(1)
  const [order, setOrder] = useState<DetailOrder>('count_desc')
  const [isOrderOpen, setIsOrderOpen] = useState(false)
  const [copyNotice, setCopyNotice] = useState(false)
  const config = getDetailConfig(detail)
  const DetailIcon = detail === 'ngrams' ? Hash : detail === 'keywords' ? KeyRound : BarChart3
  const orderOptions: Array<{ label: string; value: DetailOrder }> = [
    { label: 'Частота ↓', value: 'count_desc' },
    { label: 'Частота ↑', value: 'count_asc' },
  ]
  const orderLabel = orderOptions.find((option) => option.value === order)?.label ?? orderOptions[0].label
  const rows = useMemo(
    () => getDetailChartRows(detail, result, { minLength, order, topN }),
    [detail, minLength, order, result, topN],
  )

  function handleMarkdownCopy() {
    copyMarkdownTable(config.title, detailMarkdownHeaders(detail), detailRowsToMarkdown(detail, rows))
    setCopyNotice(true)
    window.setTimeout(() => setCopyNotice(false), 950)
  }

  return (
    <div className={styles.detailOverlay} role="dialog" aria-modal="true">
      <section className={styles.detailModal}>
        <div className={styles.detailHeader}>
          <div className={styles.detailHeaderContent}>
            <div className={styles.detailHeaderTop}>
              <h2>
                <DetailIcon size={20} />
                <span>{config.title}</span>
              </h2>
              <button aria-label="Закрыть" type="button" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
            <p>{config.description}</p>
          </div>
        </div>

        <div className={styles.detailToolbar}>
          <div className={styles.detailFilters}>
            <label className={styles.detailNumberControl}>
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
              className={topN === 'all' ? styles.detailAllButtonActive : styles.detailAllButton}
              type="button"
              onClick={() => setTopN('all')}
            >
              Все
            </button>

            <label className={styles.detailNumberControl}>
              <span>Мин. длина</span>
              <input
                min={0}
                type="number"
                value={minLength}
                onChange={(event) => setMinLength(Math.max(0, Number(event.target.value) || 0))}
              />
            </label>

            <div className={styles.detailControlGroup}>
              <span>Сортировка</span>
              <div className={styles.detailDropdown}>
                <button
                  aria-expanded={isOrderOpen}
                  aria-haspopup="listbox"
                  className={styles.detailDropdownButton}
                  type="button"
                  onClick={() => setIsOrderOpen((value) => !value)}
                >
                  <span>{orderLabel}</span>
                  <ChevronRight size={15} />
                </button>
                {isOrderOpen ? (
                  <div className={styles.detailDropdownMenu} role="listbox">
                    {orderOptions.map((option) => (
                      <button
                        className={order === option.value ? styles.detailDropdownActive : ''}
                        key={option.value}
                        role="option"
                        aria-selected={order === option.value}
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

          <div className={styles.detailActionBar}>
            {copyNotice ? (
              <span className={`${styles.detailCopyNotice} ${styles.copyFeedback}`} role="status">
                <Check size={14} />
                <span>Скопировано</span>
              </span>
            ) : null}
            <ChartActions
              disabled={isExporting}
              onCsv={() => onCsvExport(detail)}
              onMarkdown={handleMarkdownCopy}
              onPng={() => downloadChartPng(config.title, detailRowsToChartRows(rows).slice(0, PNG_EXPORT_ROW_LIMIT))}
            />
          </div>
        </div>

        <CustomScrollArea className={styles.detailChart}>
          <DetailBarChart rows={rows} type={detail} />
        </CustomScrollArea>
      </section>
    </div>
  )
}

function DetailBarChart({ rows, type }: { rows: DetailChartRow[]; type: DetailKind }) {
  const max = Math.max(1, ...rows.map((row) => row.count))

  if (rows.length === 0) {
    return (
      <div className={styles.detailChartEmpty}>
        <EmptyPlaceholder fill />
      </div>
    )
  }

  return (
    <div className={styles.detailChartRows}>
      {rows.map((row) => (
        <div className={`${styles.detailChartRow} ${type === 'keywords' ? styles.detailChartRowKeywords : ''}`} key={`${row.label}-${row.status ?? ''}`}>
          <span title={row.label}>{row.label}</span>
          <div className={styles.detailChartBar}>
            <i style={{ width: `${Math.max(3, (row.count / max) * 100)}%` }} />
          </div>
          <b>{formatNumber(row.count)}</b>
          <small>{formatPercent(row.density)}</small>
          {type === 'keywords' ? <em className={`${styles.keywordStatus} ${row.count > 0 ? styles.keywordStatusFound : styles.keywordStatusMissing}`}>{keywordStatusLabel(row)}</em> : null}
        </div>
      ))}
    </div>
  )
}
