import { Check, ChevronRight, FileText, PlayCircle, X } from 'lucide-react'
import styles from '../../../App/Styles.module.scss'
import { formatCount, formatNumber } from '../../../Utils/lexema'
import type { DocumentItem } from '../../../Models/documents'
import { CustomScrollArea } from '../../Pages/SeoAnalysisPage/CustomScrollArea'

export function AnalysisDocumentPicker({
  analyzeLabel = 'Анализировать',
  analyzingLabel = 'Анализируем...',
  documents,
  isAnalyzing,
  onAnalyze,
  onSelectAll,
  onSelectNone,
  onToggleDocument,
  selectedDocumentIds,
}: {
  analyzeLabel?: string
  analyzingLabel?: string
  documents: DocumentItem[]
  isAnalyzing: boolean
  onAnalyze: () => void
  onSelectAll: () => void
  onSelectNone: () => void
  onToggleDocument: (id: string) => void
  selectedDocumentIds: string[]
}) {
  return (
    <section className={`${styles.card} ${styles.seoControlCard} ${styles.seoDocumentControlCard}`}>
      <div className={styles.seoBlockHeader}>
        <div>
          <h2 className={styles.seoHeaderTitle}>
            <FileText size={18} />
            Документы для анализа
          </h2>
        </div>
        <span className={styles.mutedCounter}>Выбрано: {selectedDocumentIds.length} из {documents.length}</span>
      </div>

      <CustomScrollArea className={styles.seoDocumentPickList}>
        {documents.map((document) => {
          const selected = selectedDocumentIds.includes(document.id)

          return (
            <label
              className={`${styles.seoPickRow} ${selected ? styles.seoPickRowSelected : ''}`}
              key={document.id}
            >
              <input
                checked={selected}
                type="checkbox"
                onChange={() => onToggleDocument(document.id)}
              />
              <span className={styles.seoCheckmark} aria-hidden="true">
                {selected ? <Check size={13} strokeWidth={3} /> : null}
              </span>
              <span className={styles.seoDocumentIcon}>
                <FileText size={17} />
              </span>
              <span className={styles.seoPickText}>
                <b title={document.title}>{document.title}</b>
                <small>
                  {formatCount(document.raw_word_count, ['слово', 'слова', 'слов'])} · {formatNumber(document.char_count)} симв.
                </small>
              </span>
              <ChevronRight size={17} />
            </label>
          )
        })}
      </CustomScrollArea>

      <div className={styles.seoDocumentActions}>
        <div className={styles.seoDocumentBulkActions}>
          <button className={styles.secondaryButton} type="button" onClick={onSelectAll}>
            <Check size={16} />
            Выбрать все
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onSelectNone}>
            <X size={16} />
            Снять выбор
          </button>
        </div>
        <button
          className={`${styles.primaryButton} ${styles.seoAnalyzeButton}`}
          disabled={selectedDocumentIds.length === 0 || isAnalyzing}
          type="button"
          onClick={onAnalyze}
        >
          <PlayCircle size={19} />
          {isAnalyzing ? analyzingLabel : analyzeLabel}
        </button>
      </div>
    </section>
  )
}
