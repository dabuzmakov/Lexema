import type { DocumentItem } from '../../../Models/documents'
import { AnalysisDocumentPicker } from '../../Widgets/AnalysisDocumentPicker'

export function SpellingDocumentSelector({
  documents,
  isAnalyzing,
  onAnalyze,
  onRemoveDocument,
  onSelectDocument,
  selectedDocumentIds,
}: {
  documents: DocumentItem[]
  isAnalyzing: boolean
  onAnalyze: () => void
  onRemoveDocument: (id: string) => void
  onSelectDocument: (id: string) => void
  selectedDocumentIds: string[]
}) {
  function handleToggleDocument(documentId: string) {
    if (selectedDocumentIds.includes(documentId)) {
      onRemoveDocument(documentId)
      return
    }

    onSelectDocument(documentId)
  }

  function handleSelectAll() {
    documents.forEach((document) => {
      if (!selectedDocumentIds.includes(document.id)) {
        onSelectDocument(document.id)
      }
    })
  }

  function handleSelectNone() {
    selectedDocumentIds.forEach(onRemoveDocument)
  }

  return (
    <AnalysisDocumentPicker
      analyzingLabel="Проверяем..."
      documents={documents}
      isAnalyzing={isAnalyzing}
      onAnalyze={onAnalyze}
      onSelectAll={handleSelectAll}
      onSelectNone={handleSelectNone}
      onToggleDocument={handleToggleDocument}
      selectedDocumentIds={selectedDocumentIds}
    />
  )
}
