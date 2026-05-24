import type { CompareAnalysisResult, CompareTableExportType, LastAnalysisResult } from '../../../Models/analysis'
import type { DocumentItem } from '../../../Models/documents'
import type { AnalysisSettings } from '../../../Models/settings'

export interface CompareAnalysisPageProps {
  compareDocumentAId: string | null
  compareDocumentBId: string | null
  compareResult: LastAnalysisResult<CompareAnalysisResult> | null
  documents: DocumentItem[]
  errorMessage: string | null
  isAnalyzing: boolean
  isExporting: boolean
  onAnalyze: () => void
  onClear: () => void
  onCsvExport: (type: CompareTableExportType) => void
  onOpenDocuments: () => void
  onOpenFilePicker: () => void
  onOpenSettings: () => void
  onUploadFiles: (files: FileList | File[]) => void
  onSelectDocumentA: (documentId: string | null) => void
  onSelectDocumentB: (documentId: string | null) => void
  settings: AnalysisSettings
}
