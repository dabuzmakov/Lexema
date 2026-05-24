import type { DocumentItem } from '../../../../Models/documents'
import { AnalysisDocumentPicker } from '../../../Widgets/AnalysisDocumentPicker'

export function SeoDocumentPicker({
  documents,
  isAnalyzing,
  onAnalyze,
  onSelectAll,
  onSelectNone,
  onToggleDocument,
  selectedDocumentIds,
}: {
  documents: DocumentItem[]
  isAnalyzing: boolean
  onAnalyze: () => void
  onSelectAll: () => void
  onSelectNone: () => void
  onToggleDocument: (id: string) => void
  selectedDocumentIds: string[]
}) {
  return (
    <AnalysisDocumentPicker
      documents={documents}
      isAnalyzing={isAnalyzing}
      onAnalyze={onAnalyze}
      onSelectAll={onSelectAll}
      onSelectNone={onSelectNone}
      onToggleDocument={onToggleDocument}
      selectedDocumentIds={selectedDocumentIds}
    />
  )
}
