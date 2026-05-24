import { ChevronDown, FileText, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatCount, formatDate } from '../../../Utils/lexema'
import type { DocumentItem } from '../../../Models/documents'
import styles from './Styles.module.scss'

type Slot = 'a' | 'b'

export function CompareDocumentSelector({
  documentAId,
  documentBId,
  documents,
  onSelectA,
  onSelectB,
}: {
  documentAId: string | null
  documentBId: string | null
  documents: DocumentItem[]
  onSelectA: (documentId: string | null) => void
  onSelectB: (documentId: string | null) => void
}) {
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)
  const ref = useRef<HTMLDivElement | null>(null)
  const documentA = documents.find((document) => document.id === documentAId) ?? null
  const documentB = documents.find((document) => document.id === documentBId) ?? null

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpenSlot(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <section className={styles.pickerGrid} ref={ref}>
      <DocumentCard
        accent="a"
        disabledId={documentBId}
        documents={documents}
        isOpen={openSlot === 'a'}
        label="Текст A"
        selectedDocument={documentA}
        onClear={() => onSelectA(null)}
        onOpen={() => setOpenSlot((current) => (current === 'a' ? null : 'a'))}
        onSelect={(documentId) => {
          onSelectA(documentId)
          setOpenSlot(null)
        }}
      />
      <div className={styles.vsDivider} aria-hidden="true">
        <span>VS</span>
      </div>
      <DocumentCard
        accent="b"
        disabledId={documentAId}
        documents={documents}
        isOpen={openSlot === 'b'}
        label="Текст B"
        selectedDocument={documentB}
        onClear={() => onSelectB(null)}
        onOpen={() => setOpenSlot((current) => (current === 'b' ? null : 'b'))}
        onSelect={(documentId) => {
          onSelectB(documentId)
          setOpenSlot(null)
        }}
      />
    </section>
  )
}

function DocumentCard({
  accent,
  disabledId,
  documents,
  isOpen,
  label,
  selectedDocument,
  onClear,
  onOpen,
  onSelect,
}: {
  accent: Slot
  disabledId: string | null
  documents: DocumentItem[]
  isOpen: boolean
  label: string
  selectedDocument: DocumentItem | null
  onClear: () => void
  onOpen: () => void
  onSelect: (documentId: string) => void
}) {
  return (
    <article className={`${styles.documentCard} ${accent === 'a' ? styles.documentCardA : styles.documentCardB}`}>
      <header className={styles.documentCardHeader}>
        <span className={styles.documentCardTitle}>
          <span>
            <FileText size={17} />
            <b>{label}</b>
          </span>
        </span>
        {selectedDocument ? (
          <button className={styles.clearDocumentButton} type="button" aria-label={`Очистить ${label}`} onClick={onClear}>
            <X size={15} />
          </button>
        ) : null}
      </header>

      <div className={styles.documentSelectWrap}>
        <button className={styles.documentSelectButton} type="button" onClick={onOpen}>
          {selectedDocument ? (
            <>
              <span className={styles.documentBadge}>
                <FileText size={22} />
              </span>
              <span className={styles.documentSelectText}>
                <b>{selectedDocument.title}</b>
                <small>
                  {formatCount(selectedDocument.raw_word_count, ['слово', 'слова', 'слов'])} · {formatCount(selectedDocument.char_count, ['символ', 'символа', 'символов'])}
                </small>
              </span>
            </>
          ) : (
            <span className={styles.documentSelectPlaceholder}>Выберите документ</span>
          )}
          <ChevronDown size={18} />
        </button>

        {isOpen ? (
          <div className={styles.documentMenu}>
            {documents.map((document) => {
              const disabled = document.id === disabledId
              const selected = document.id === selectedDocument?.id
              return (
                <button
                  className={selected ? styles.documentMenuItemActive : ''}
                  disabled={disabled}
                  key={document.id}
                  type="button"
                  onClick={() => onSelect(document.id)}
                >
                  <span className={styles.documentMenuIcon}>
                    <FileText size={18} />
                  </span>
                  <span>
                    <b>{document.title}</b>
                    <small>
                      {formatCount(document.raw_word_count, ['слово', 'слова', 'слов'])} · {formatDate(document.updated_at)}
                    </small>
                  </span>
                  {selected || disabled ? (
                    <em className={disabled && !selected ? styles.documentMenuDisabledBadge : undefined}>выбран</em>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </article>
  )
}
