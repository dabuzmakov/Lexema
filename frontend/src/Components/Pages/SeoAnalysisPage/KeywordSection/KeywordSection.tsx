import { KeyRound } from 'lucide-react'
import type { CSSProperties } from 'react'
import styles from '../../../../App/Styles.module.scss'
import { formatPercent } from '../../../../Utils/lexema'
import type { SeoKeywordRow, SeoResult, SeoTableExportType } from '../../../../Models/analysis'
import { ChartActions } from '../ChartActions'
import { CustomScrollArea } from '../CustomScrollArea'
import { EmptyPlaceholder } from '../EmptyPlaceholder'
import { ResultSection } from '../ResultSection'
import { downloadChartPng, keywordRowsToChartRows } from '../utils'

export function KeywordSection({
  isExporting,
  onCopyMarkdown,
  onCsvExport,
  onShowDetails,
  result,
}: {
  isExporting: boolean
  onCopyMarkdown: (rows: SeoKeywordRow[]) => void
  onCsvExport: (type: SeoTableExportType) => void
  onShowDetails: () => void
  result: SeoResult
}) {
  return (
    <ResultSection
      actions={
        <ChartActions
          disabled={isExporting}
          onCsv={() => onCsvExport('keywords')}
          onDetails={onShowDetails}
          onMarkdown={() => onCopyMarkdown(result.keywords)}
          onPng={() => downloadChartPng('Ключевые слова', keywordRowsToChartRows(result.keywords.slice(0, 6)))}
        />
      }
      actionsPosition="footer"
      icon={<KeyRound size={18} />}
      title="Ключевые слова"
    >
      <KeywordCoverage result={result} />
    </ResultSection>
  )
}

function KeywordCoverage({ result }: { result: SeoResult }) {
  return (
    <div className={styles.keywordCoverageGrid}>
      <div className={styles.keywordCoverageGauge}>
        <div className={styles.coverageDonut} style={{ '--percent': `${result.summary.keyword_coverage_percent}%` } as CSSProperties}>
          <span>{formatPercent(result.summary.keyword_coverage_percent)}</span>
        </div>
        <h3>Покрытие</h3>
      </div>
      <CustomScrollArea className={styles.keywordMiniScroll}>
        <div className={styles.keywordMiniList}>
          {result.keywords.slice(0, 6).map((row) => (
            <div className={styles.keywordMiniRow} key={row.keyword}>
              <span>{row.keyword}</span>
              <b>{row.count}</b>
              <small>{formatPercent(row.density)}</small>
              <em className={`${styles.keywordStatus} ${row.count > 0 ? styles.keywordStatusFound : styles.keywordStatusMissing}`}>
                {row.count > 0 ? 'В тексте' : 'Не найдено'}
              </em>
            </div>
          ))}
          {result.keywords.length === 0 ? <EmptyPlaceholder fill /> : null}
        </div>
      </CustomScrollArea>
    </div>
  )
}
