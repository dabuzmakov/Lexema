import { BarChart3, Hash } from 'lucide-react'
import { formatNumber, formatPercent } from '../../../Utils/lexema'
import type {
  CompareNgramsComparison,
  CompareAnalysisResult,
  CompareNgramCommonItem,
  CompareTableExportType,
  CompareWordCommonItem,
  CompareWordsComparison,
} from '../../../Models/analysis'
import { ChartActions } from '../SeoAnalysisPage/ChartActions'
import { ResultSection } from '../SeoAnalysisPage/ResultSection'
import { downloadChartPng } from '../SeoAnalysisPage/utils'
import { copyCompareMarkdown, getCompareDetailRows, rowsToChartRows } from './CompareDetailsModal'
import styles from './Styles.module.scss'
import { formatSignedNumber, metricTone } from './utils'

const PREVIEW_ROWS = 6

export function CompareTermsBlock({
  comparison,
  detail,
  isExporting,
  kind,
  onCsvExport,
  onShowDetails,
  result,
  title,
}: {
  comparison: CompareWordsComparison | CompareNgramsComparison
  detail: CompareTableExportType
  isExporting: boolean
  kind: 'words' | 'ngrams'
  onCsvExport: (type: CompareTableExportType) => void
  onShowDetails: () => void
  result: CompareAnalysisResult
  title: string
}) {
  const rows = comparison.common ?? []
  const visibleRows = rows.slice(0, PREVIEW_ROWS)
  const detailRows = getCompareDetailRows(detail, result)

  return (
    <ResultSection
      actions={(
        <ChartActions
          disabled={isExporting}
          onCsv={() => onCsvExport(detail)}
          onDetails={onShowDetails}
          onMarkdown={() => copyCompareMarkdown(title, detail, detailRows)}
          onPng={() => downloadChartPng(title, rowsToChartRows(detailRows).slice(0, 24))}
        />
      )}
      actionsPosition="footer"
      icon={kind === 'ngrams' ? <Hash size={18} /> : <BarChart3 size={18} />}
      title={title}
    >
      <div className={styles.compareTermsList}>
        {visibleRows.map((row, index) => (
          <CompareTermRow key={`${getTermLabel(row, kind)}-${index}`} kind={kind} row={row} />
        ))}
        {visibleRows.length === 0 ? <div className={styles.blockEmpty}>Нет общих данных</div> : null}
      </div>
    </ResultSection>
  )
}

function CompareTermRow({
  kind,
  row,
}: {
  kind: 'words' | 'ngrams'
  row: CompareWordsComparison['common'][number] | CompareNgramsComparison['common'][number]
}) {
  const label = getTermLabel(row, kind)
  const common = row as CompareWordCommonItem & CompareNgramCommonItem
  const max = Math.max(1, common.a_count, common.b_count)
  const tone = metricTone(common.diff_count)

  return (
    <div className={styles.compareTermRow}>
      <div className={styles.compareDetailTerm}>
        <b title={label}>{label}</b>
      </div>
      <div className={styles.compareDetailBars}>
        <div className={styles.compareDetailBarLine}>
          <span>A</span>
          <i className={styles.compareDetailBarA} style={{ width: `${Math.max(3, common.a_count / max * 100)}%` }} />
          <b>{formatNumber(common.a_count)}</b>
          <small>{formatPercent(common.a_density ?? 0)}</small>
        </div>
        <div className={styles.compareDetailBarLine}>
          <span>B</span>
          <i className={styles.compareDetailBarB} style={{ width: `${Math.max(3, common.b_count / max * 100)}%` }} />
          <b>{formatNumber(common.b_count)}</b>
          <small>{formatPercent(common.b_density ?? 0)}</small>
        </div>
      </div>
      <div className={`${styles.compareDetailDiff} ${styles.compareTermDiff} ${styles[`tone_${tone}`]}`}>
        <b>{formatSignedNumber(common.diff_count)}</b>
        <small>{formatSignedNumber(common.diff_density ?? 0, '%')}</small>
      </div>
    </div>
  )
}

function getTermLabel(
  row: CompareWordsComparison['common'][number] | CompareNgramsComparison['common'][number],
  kind: 'words' | 'ngrams',
) {
  if (kind === 'ngrams' && 'phrase' in row) {
    return row.phrase
  }
  return 'word' in row ? row.word : ''
}
