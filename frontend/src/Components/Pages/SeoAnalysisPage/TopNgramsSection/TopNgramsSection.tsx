import { Hash } from 'lucide-react'
import type { SeoNgramRow, SeoTableExportType } from '../../../../Models/analysis'
import { ChartActions } from '../ChartActions'
import { HorizontalBarChart } from '../HorizontalBarChart'
import { ResultSection } from '../ResultSection'
import { downloadChartPng, ngramRowsToChartRows, ngramRowsToDisplay } from '../utils'

export function TopNgramsSection({
  isExporting,
  onCopyMarkdown,
  onCsvExport,
  onShowDetails,
  rows,
}: {
  isExporting: boolean
  onCopyMarkdown: (rows: SeoNgramRow[]) => void
  onCsvExport: (type: SeoTableExportType) => void
  onShowDetails: () => void
  rows: SeoNgramRow[]
}) {
  return (
    <ResultSection
      actions={
        <ChartActions
          disabled={isExporting}
          onCsv={() => onCsvExport('ngrams')}
          onDetails={onShowDetails}
          onMarkdown={() => onCopyMarkdown(rows)}
          onPng={() => downloadChartPng('Топ N-грамм', ngramRowsToChartRows(rows))}
        />
      }
      actionsPosition="footer"
      icon={<Hash size={18} />}
      title="Топ N-грамм"
    >
      <HorizontalBarChart rows={ngramRowsToDisplay(rows)} />
    </ResultSection>
  )
}
