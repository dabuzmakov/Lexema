import { KeyRound } from 'lucide-react'
import type { CSSProperties } from 'react'
import appStyles from '../../../App/Styles.module.scss'
import { formatNumber, formatPercent } from '../../../Utils/lexema'
import type { CompareAnalysisResult, CompareKeywordItem, CompareTableExportType } from '../../../Models/analysis'
import { EmptyPlaceholder } from '../SeoAnalysisPage/EmptyPlaceholder'
import { ResultSection } from '../SeoAnalysisPage/ResultSection'
import { ChartActions } from '../SeoAnalysisPage/ChartActions'
import { downloadChartPng } from '../SeoAnalysisPage/utils'
import { copyCompareMarkdown, getCompareDetailRows, rowsToChartRows } from './CompareDetailsModal'
import styles from './Styles.module.scss'
import { keywordStatusLabel } from './utils'

export function CompareKeywordsBlock({
  isExporting,
  onCsvExport,
  onShowDetails,
  result,
}: {
  isExporting: boolean
  onCsvExport: (type: CompareTableExportType) => void
  onShowDetails: () => void
  result: CompareAnalysisResult
}) {
  const rows = result.keywords_comparison ?? []
  const previewRows = rows.slice(0, 6)
  const detailRows = getCompareDetailRows('keywords', result)

  return (
    <ResultSection
      actions={(
        <ChartActions
          disabled={isExporting}
          onCsv={() => onCsvExport('keywords')}
          onDetails={onShowDetails}
          onMarkdown={() => copyCompareMarkdown('Ключевые слова', 'keywords', detailRows)}
          onPng={() => downloadChartPng('Ключевые слова', rowsToChartRows(detailRows).slice(0, 24))}
        />
      )}
      actionsPosition="footer"
      icon={<KeyRound size={18} />}
      title="Ключевые слова"
    >
      <div className={styles.compareKeywordLayout}>
        <div className={appStyles.keywordMiniList}>
          {previewRows.map((row) => (
            <KeywordRow key={row.keyword} row={row} />
          ))}
          {rows.length === 0 ? <EmptyPlaceholder fill text="Ключевые слова не заданы в параметрах" /> : null}
        </div>
        <div className={styles.compareCoverageGauges}>
          <CoverageGauge label="Покрытие A" value={result.summary.keyword_coverage_a ?? 0} />
          <CoverageGauge label="Покрытие B" value={result.summary.keyword_coverage_b ?? 0} />
        </div>
      </div>
    </ResultSection>
  )
}

function CoverageGauge({ label, value }: { label: string; value: number }) {
  return (
    <div className={appStyles.keywordCoverageGauge}>
      <div className={appStyles.coverageDonut} style={{ '--percent': `${value}%` } as CSSProperties}>
        <span>{formatPercent(value)}</span>
      </div>
      <h3>{label}</h3>
    </div>
  )
}

function KeywordRow({ row }: { row: CompareKeywordItem }) {
  return (
    <div className={`${appStyles.keywordMiniRow} ${styles.compareKeywordMiniRow}`}>
      <span className={styles.compareKeywordName} title={row.keyword}>{row.keyword}</span>
      <b className={styles.compareKeywordDesktopCount}>{formatNumber(row.a.count)} / {formatNumber(row.b.count)}</b>
      <small className={styles.compareKeywordDesktopDensity}>{formatPercent(row.a.density)} / {formatPercent(row.b.density)}</small>
      <div className={styles.compareKeywordValues}>
        <span>
          <b>A</b>
          <strong>{formatNumber(row.a.count)}</strong>
          <small>{formatPercent(row.a.density)}</small>
        </span>
        <span>
          <b>B</b>
          <strong>{formatNumber(row.b.count)}</strong>
          <small>{formatPercent(row.b.density)}</small>
        </span>
      </div>
      <em className={`${appStyles.keywordStatus} ${styles[`status_${row.status}`] ?? ''}`}>
        {keywordStatusLabel(row.status)}
      </em>
    </div>
  )
}
