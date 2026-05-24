import type { LastAnalysisResult, SpellingIssue, SpellingResult } from '../../../Models/analysis'
import type { DocumentItem } from '../../../Models/documents'

export interface SpellingCheckPageProps {
  currentDocumentId: string | null
  documents: DocumentItem[]
  errorMessage: string | null
  isAnalyzing: boolean
  onAnalyze: () => void
  onClear: () => void
  onOpenDocuments: () => void
  onOpenFilePicker: () => void
  onUploadFiles: (files: FileList | File[]) => void
  onRemoveDocument: (id: string) => void
  onSelectDocument: (id: string) => void
  onSetCurrentDocument: (id: string) => void
  selectedDocumentIds: string[]
  selectedDocuments: DocumentItem[]
  spellingResult: LastAnalysisResult<SpellingResult> | null
}

export interface SpellingHighlightRange extends SpellingIssue {
  end: number
}
