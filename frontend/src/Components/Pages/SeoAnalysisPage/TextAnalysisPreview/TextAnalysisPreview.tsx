import { Check, ChevronRight, FileText, ListChecks } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import styles from '../../../../App/Styles.module.scss'
import { formatCount } from '../../../../Utils/lexema'
import type { SeoResult } from '../../../../Models/analysis'
import type { DocumentItem } from '../../../../Models/documents'
import type { AnalysisSettings } from '../../../../Models/settings'
import { CustomScrollArea } from '../CustomScrollArea'
import { EmptyPlaceholder } from '../EmptyPlaceholder'
import { HighlightedText } from '../HighlightedText'
import { TextHighlightControls } from '../TextHighlightControls'
import type { HighlightKind } from '../types'

export function TextAnalysisPreview({
  result,
  selectedDocuments,
  settings,
}: {
  result: SeoResult
  selectedDocuments: DocumentItem[]
  settings: AnalysisSettings
}) {
  const documents = selectedDocuments
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement | null>(null)
  const [highlights, setHighlights] = useState<Record<HighlightKind, boolean>>({
    keywords: true,
    stop: true,
    water: true,
    mixed: true,
  })
  const activeDocument = documents[Math.min(activeIndex, Math.max(0, documents.length - 1))]

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, documents.length - 1)))
  }, [documents.length])

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

  if (!activeDocument) {
    return (
      <section className={`${styles.card} ${styles.textPreviewCard} ${styles.textPreviewCardEmpty}`}>
        <div className={styles.seoResultHeader}>
          <h2 className={styles.seoHeaderTitle}>
            <ListChecks size={18} />
            Анализируемый текст
          </h2>
        </div>
        <EmptyPlaceholder fill />
      </section>
    )
  }

  return (
    <section className={`${styles.card} ${styles.textPreviewCard}`}>
      <div className={styles.textPreviewHeader}>
        <div>
          <h2 className={styles.seoHeaderTitle}>
            <ListChecks size={18} />
            Анализируемый текст
          </h2>
        </div>
        <span className={styles.textPreviewCounter}>{activeIndex + 1} из {documents.length}</span>
      </div>

      <div className={styles.textPreviewControls}>
        <div className={styles.customSelectField}>
          <span className={styles.customSelectLabel}>Документ</span>
          <div ref={selectRef} className={`${styles.customSelect} ${isMenuOpen ? styles.customSelectOpen : ''}`}>
            <button
              aria-expanded={isMenuOpen}
              aria-haspopup="listbox"
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
            >
              <span className={styles.customSelectValue}>
                <span className={styles.customSelectIcon}>
                  <FileText size={16} />
                </span>
                <span className={styles.customSelectText}>
                  <b title={activeDocument.title}>{activeDocument.title}</b>
                  <small>{activeIndex + 1} из {documents.length} · {formatCount(activeDocument.raw_word_count, ['слово', 'слова', 'слов'])}</small>
                </span>
              </span>
              <ChevronRight className={styles.customSelectChevron} size={16} />
            </button>
            {isMenuOpen ? (
              <CustomScrollArea className={styles.customSelectMenu}>
                {documents.map((document, index) => (
                  <button
                    className={activeIndex === index ? styles.customSelectActive : ''}
                    key={document.id}
                    role="option"
                    aria-selected={activeIndex === index}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setActiveIndex(index)
                      setIsMenuOpen(false)
                    }}
                  >
                    <span className={styles.customSelectOption}>
                      <span className={styles.customSelectOptionIcon}>
                        <FileText size={15} />
                      </span>
                      <span className={styles.customSelectOptionText}>
                        <b title={document.title}>{document.title}</b>
                        <small>{index + 1} из {documents.length} · {formatCount(document.raw_word_count, ['слово', 'слова', 'слов'])}</small>
                      </span>
                      <span className={styles.customSelectOptionCheck}>
                        {activeIndex === index ? <Check size={14} strokeWidth={3} /> : null}
                      </span>
                    </span>
                  </button>
                ))}
              </CustomScrollArea>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.textPreviewToolbar}>
        <TextHighlightControls
          highlights={highlights}
          onToggle={(key) => setHighlights((current) => ({ ...current, [key]: !current[key] }))}
        />
      </div>

      <span className={styles.textPreviewContentLabel}>Содержимое</span>

      <CustomScrollArea className={styles.textPreviewScroll}>
        <div className={styles.textPreviewContent}>
          {activeDocument.content.trim().length === 0 ? (
            <EmptyPlaceholder fill />
          ) : (
            <HighlightedText
              enabled={highlights}
              result={result}
              settings={settings}
              text={activeDocument.content}
            />
          )}
        </div>
      </CustomScrollArea>
    </section>
  )
}
