import { BarChart3 } from 'lucide-react'
import type { SeoTableExportType, SeoWordRow } from '../../../../Models/analysis'
import { ChartActions } from '../ChartActions'
import { HorizontalBarChart } from '../HorizontalBarChart'
import { ResultSection } from '../ResultSection'
import { downloadChartPng, wordRowsToDisplay, wordsToChartRows } from '../utils'

export function TopWordsSection({
  isExporting,
  onCopyMarkdown,
  onCsvExport,
  onShowDetails,
  rows,
}: {
  isExporting: boolean
  onCopyMarkdown: (rows: SeoWordRow[]) => void
  onCsvExport: (type: SeoTableExportType) => void
  onShowDetails: () => void
  rows: SeoWordRow[]
}) {
  return (
    <ResultSection
      actions={
        <ChartActions
          disabled={isExporting}
          onCsv={() => onCsvExport('words')}
          onDetails={onShowDetails}
          onMarkdown={() => onCopyMarkdown(rows)}
          onPng={() => downloadChartPng('Топ слов', wordsToChartRows(rows))}
        />
      }
      actionsPosition="footer"
      icon={<BarChart3 size={18} />}
      title="Топ слов"
    >
      <HorizontalBarChart rows={wordRowsToDisplay(rows)} />
    </ResultSection>
  )
}
