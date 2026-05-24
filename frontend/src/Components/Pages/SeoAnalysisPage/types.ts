import type { ReactNode } from 'react'
import type { KeywordStatus, LastAnalysisResult, SeoKeywordRow, SeoNgramRow, SeoResult, SeoTableExportType, SeoWordRow } from '../../../Models/analysis'
import type { DocumentItem } from '../../../Models/documents'
import type { AnalysisSettings } from '../../../Models/settings'

export type DetailKind = 'words' | 'ngrams' | 'keywords'
export type HighlightKind = 'keywords' | 'stop' | 'water' | 'mixed'
export type DetailOrder = 'count_desc' | 'count_asc'
export type DetailTopN = number | 'all'

export interface ChartRow {
  label: string
  value: number
  meta?: string
}

export interface DetailChartRow {
  label: string
  count: number
  density: number
  status?: KeywordStatus
}

export interface SeoAnalysisPageProps {
  documents: DocumentItem[]
  isAnalyzing: boolean
  isExporting: boolean
  onAnalyze: () => void
  onCopyKeywordsMarkdown: (rows: SeoKeywordRow[]) => void
  onCopyNgramsMarkdown: (rows: SeoNgramRow[]) => void
  onCopyWordsMarkdown: (rows: SeoWordRow[]) => void
  onCsvExport: (type: SeoTableExportType) => void
  onOpenFilePicker: () => void
  onOpenSettings: () => void
  onUploadFiles: (files: FileList | File[]) => void
  onSelectAll: () => void
  onSelectNone: () => void
  onToggleDocument: (id: string) => void
  selectedDocumentIds: string[]
  selectedDocuments: DocumentItem[]
  seoResult: LastAnalysisResult<SeoResult> | null
  settings: AnalysisSettings
}

export interface ResultSectionProps {
  actions?: ReactNode
  actionsPosition?: 'header' | 'footer'
  children: ReactNode
  icon?: ReactNode
  title: string
  wide?: boolean
}
