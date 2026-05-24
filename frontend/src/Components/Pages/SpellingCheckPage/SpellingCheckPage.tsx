import { AlertTriangle, FileUp, FolderOpen, Languages, RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import appStyles from '../../../App/Styles.module.scss'
import { formatCount } from '../../../Utils/lexema'
import type { SpellingCategory, SpellingIssue } from '../../../Models/analysis'
import { PageHeader } from '../../Layouts/PageHeader'
import { SilentDropUploadArea } from '../../Widgets/SilentDropUploadArea'
import { SPELLING_CATEGORY_ORDER, normalizeSpellingCategory } from './constants'
import { SpellingDocumentSelector } from './SpellingDocumentSelector'
import { SpellingIssuesList } from './SpellingIssuesList'
import { SpellingSummaryCard } from './SpellingSummaryCard'
import { SpellingTextPreview } from './SpellingTextPreview'
import type { SpellingCheckPageProps } from './types'
import styles from './Styles.module.scss'

export function SpellingCheckPage({
  currentDocumentId,
  documents,
  errorMessage,
  isAnalyzing,
  onAnalyze,
  onOpenDocuments,
  onOpenFilePicker,
  onUploadFiles,
  onRemoveDocument,
  onSelectDocument,
  onSetCurrentDocument,
  selectedDocumentIds,
  selectedDocuments,
  spellingResult,
}: SpellingCheckPageProps) {
  const result = spellingResult?.result ?? null
  const currentDocument = selectedDocuments.find((document) => document.id === currentDocumentId)
    ?? selectedDocuments[0]
    ?? null
  const currentResult = result?.documents.find((document) => document.document_id === currentDocument?.id)
    ?? null
  const currentIssues = currentResult?.issues ?? []

  const issueCounts = useMemo(() => buildIssueCounts(result?.documents.flatMap((document) => document.issues) ?? []), [result])
  const currentIssueCounts = useMemo(() => buildIssueCounts(currentIssues), [currentIssues])
  const checkedWords = selectedDocuments.reduce((sum, document) => sum + document.raw_word_count, 0)
  const checkedChars = result?.documents.reduce((sum, document) => sum + document.checked_char_count, 0)
    ?? selectedDocuments.reduce((sum, document) => sum + document.char_count, 0)

  if (documents.length === 0) {
    return (
      <div className={`${appStyles.pageStack} ${appStyles.documentsPage} ${styles.spellingPage}`}>
        <PageHeader
          title="Проверка орфографии"
          text="Проверка на орфографические, грамматические и пунктуационные ошибки"
        />
        <div className={appStyles.documentsToolbar}>
          <div className={appStyles.documentsToolbarMain}>
            <button className={appStyles.primaryButton} type="button" onClick={onOpenFilePicker}>
              <FileUp size={18} />
              Выбрать файл
            </button>
            <button className={appStyles.secondaryButton} type="button" onClick={onOpenDocuments}>
              <FolderOpen size={18} />
              Документы
            </button>
          </div>
        </div>
        <SilentDropUploadArea onUploadFiles={onUploadFiles}>
        <section className={`${appStyles.card} ${appStyles.documentsListCard} ${appStyles.documentsEmptyCard}`}>
          <div className={appStyles.emptyListState}>
            <FileUp size={52} />
            <b>Загрузите документы, чтобы проверить орфографию</b>
          </div>
        </section>
        </SilentDropUploadArea>
      </div>
    )
  }

  return (
    <div className={`${appStyles.pageStack} ${appStyles.seoPage} ${styles.spellingPage}`}>
      <PageHeader
        title="Проверка орфографии"
        text="Проверка на орфографические, грамматические и пунктуационные ошибки"
      />

      <div className={`${appStyles.analysisTopGrid} ${styles.spellingTopGrid}`}>
        <SilentDropUploadArea onUploadFiles={onUploadFiles}>
          <SpellingDocumentSelector
            documents={documents}
            isAnalyzing={isAnalyzing}
            onAnalyze={onAnalyze}
            onRemoveDocument={onRemoveDocument}
            onSelectDocument={onSelectDocument}
            selectedDocumentIds={selectedDocumentIds}
          />
        </SilentDropUploadArea>
        <SpellingSummaryCard
          checkedChars={checkedChars}
          checkedWords={checkedWords}
          counts={issueCounts}
          result={result}
        />
      </div>

      {errorMessage ? (
        <section className={styles.errorBanner}>
          <AlertTriangle size={20} />
          <div>
            <b>Не удалось выполнить проверку</b>
            <p>{errorMessage}</p>
          </div>
        </section>
      ) : null}

      {spellingResult && !spellingResult.is_actual ? (
        <section className={appStyles.warningBanner}>
          <AlertTriangle size={20} />
          <div>
            <b>Результат может быть неактуален</b>
            <p>Документы изменились после последней проверки</p>
          </div>
          <button className={appStyles.secondaryButton} disabled={selectedDocumentIds.length === 0 || isAnalyzing} type="button" onClick={onAnalyze}>
            <RefreshCw size={16} />
            Проверить заново
          </button>
        </section>
      ) : null}

      {!result ? (
        <section className={styles.emptyState}>
          <Languages size={58} />
          <h2>Проверка еще не выполнена</h2>
          <p>
            Выберите документы и нажмите «Анализировать». В результате появятся подсветка и список найденных ошибок.
          </p>
          <span>{selectedDocumentIds.length > 0 ? `Выбрано ${formatCount(selectedDocumentIds.length, ['документ', 'документа', 'документов'])}` : 'Документы не выбраны'}</span>
        </section>
      ) : (
        <div className={styles.resultGrid}>
          <SpellingTextPreview
            currentDocument={currentDocument}
            currentResult={currentResult}
            documents={documents}
            issueCounts={currentIssueCounts}
            onSetCurrentDocument={onSetCurrentDocument}
            selectedDocumentIds={selectedDocumentIds}
          />
          <SpellingIssuesList issues={currentIssues} />
        </div>
      )}
    </div>
  )
}

function buildIssueCounts(issues: SpellingIssue[]) {
  const counts = SPELLING_CATEGORY_ORDER.reduce<Record<string, number>>((acc, category) => {
    acc[category] = 0
    return acc
  }, {})

  issues.forEach((issue) => {
    const category = normalizeSpellingCategory(issue.category as SpellingCategory)
    counts[category] += 1
  })

  return counts
}
