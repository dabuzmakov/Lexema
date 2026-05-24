import { Check, ChevronRight, FileText, ListChecks } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import appStyles from '../../../App/Styles.module.scss'
import { formatCount } from '../../../Utils/lexema'
import type { SpellingDocumentResult } from '../../../Models/analysis'
import type { DocumentItem } from '../../../Models/documents'
import { CustomScrollArea } from '../SeoAnalysisPage/CustomScrollArea'
import { EmptyPlaceholder } from '../SeoAnalysisPage/EmptyPlaceholder'
import { getLanguageLabel } from './constants'
import { SpellingHighlightText } from './SpellingHighlightText'
import { SpellingLegend } from './SpellingLegend'
import styles from './Styles.module.scss'

export function SpellingTextPreview({
  currentDocument,
  currentResult,
  documents,
  issueCounts,
  onSetCurrentDocument,
  selectedDocumentIds,
}: {
  currentDocument: DocumentItem | null
  currentResult: SpellingDocumentResult | null
  documents: DocumentItem[]
  issueCounts: Record<string, number>
  onSetCurrentDocument: (id: string) => void
  selectedDocumentIds: string[]
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement | null>(null)
  const selectedDocuments = documents.filter((document) => selectedDocumentIds.includes(document.id))
  const activeIndex = Math.max(0, selectedDocuments.findIndex((document) => document.id === currentDocument?.id))

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!selectRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  if (!currentDocument) {
    return (
      <section className={`${appStyles.card} ${appStyles.textPreviewCard} ${appStyles.textPreviewCardEmpty} ${styles.spellingTextPreview} ${styles.spellingTextPreviewEmpty}`}>
        <div className={appStyles.textPreviewHeader}>
          <h2 className={appStyles.seoHeaderTitle}>
            <ListChecks size={18} />
            Текст документа
          </h2>
        </div>
        <EmptyPlaceholder fill />
      </section>
    )
  }

  return (
    <section className={`${appStyles.card} ${appStyles.textPreviewCard} ${styles.spellingTextPreview}`}>
      <div className={appStyles.textPreviewHeader}>
        <div>
          <h2 className={appStyles.seoHeaderTitle}>
            <ListChecks size={18} />
            Текст документа
          </h2>
        </div>
        <span className={appStyles.textPreviewCounter}>
          {activeIndex + 1} из {selectedDocuments.length || 1}
        </span>
      </div>

      <div className={appStyles.textPreviewControls}>
        <div className={appStyles.customSelectField}>
          <span className={appStyles.customSelectLabel}>Документ</span>
          <div ref={selectRef} className={`${appStyles.customSelect} ${isMenuOpen ? appStyles.customSelectOpen : ''}`}>
            <button
              aria-expanded={isMenuOpen}
              aria-haspopup="listbox"
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
            >
              <span className={appStyles.customSelectValue}>
                <span className={appStyles.customSelectIcon}>
                  <FileText size={16} />
                </span>
                <span className={appStyles.customSelectText}>
                  <b title={currentDocument.title}>{currentDocument.title}</b>
                  <small>
                    {activeIndex + 1} из {selectedDocuments.length || 1} · {formatCount(currentDocument.raw_word_count, ['слово', 'слова', 'слов'])}
                  </small>
                </span>
              </span>
              <ChevronRight className={appStyles.customSelectChevron} size={16} />
            </button>

            {isMenuOpen ? (
              <CustomScrollArea className={appStyles.customSelectMenu}>
                {selectedDocuments.map((document, index) => (
                  <button
                    className={document.id === currentDocument.id ? appStyles.customSelectActive : ''}
                    key={document.id}
                    role="option"
                    aria-selected={document.id === currentDocument.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onSetCurrentDocument(document.id)
                      setIsMenuOpen(false)
                    }}
                  >
                    <span className={appStyles.customSelectOption}>
                      <span className={appStyles.customSelectOptionIcon}>
                        <FileText size={15} />
                      </span>
                      <span className={appStyles.customSelectOptionText}>
                        <b title={document.title}>{document.title}</b>
                        <small>
                          {index + 1} из {selectedDocuments.length} · {formatCount(document.raw_word_count, ['слово', 'слова', 'слов'])}
                        </small>
                      </span>
                      <span className={appStyles.customSelectOptionCheck}>
                        {document.id === currentDocument.id ? <Check size={14} strokeWidth={3} /> : null}
                      </span>
                    </span>
                  </button>
                ))}
              </CustomScrollArea>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.previewMetaRow}>
        <span className={appStyles.textPreviewContentLabel}>Содержимое</span>
        {currentResult ? (
          <span className={styles.previewMeta}>
            {getLanguageLabel(currentResult.language)}
          </span>
        ) : null}
      </div>

      <CustomScrollArea className={`${appStyles.textPreviewScroll} ${styles.spellingPreviewScroll}`}>
        <div className={appStyles.textPreviewContent}>
          {currentDocument.content.trim().length === 0 ? (
            <EmptyPlaceholder fill />
          ) : (
            <SpellingHighlightText
              issues={currentResult?.issues ?? []}
              showHighlights
              text={currentDocument.content}
            />
          )}
        </div>
      </CustomScrollArea>

      <div className={`${appStyles.textPreviewToolbar} ${styles.spellingPreviewToolbar}`}>
        <SpellingLegend counts={issueCounts} />
      </div>
    </section>
  )
}
