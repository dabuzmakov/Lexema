import { AlertCircle, AlertTriangle, BarChart3, FileUp, FolderOpen, RefreshCw, Scale, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import appStyles from '../../../App/Styles.module.scss'
import { PageHeader } from '../../Layouts/PageHeader'
import { SilentDropUploadArea } from '../../Widgets/SilentDropUploadArea'
import { CompareDocumentSelector } from './CompareDocumentSelector'
import { CompareDetailsModal } from './CompareDetailsModal'
import { CompareKeywordsBlock } from './CompareKeywordsBlock'
import { CompareMetricsPanel } from './CompareMetricsPanel'
import { CompareSettingsBar } from './CompareSettingsBar'
import { CompareSimilarityBlock } from './CompareSimilarityBlock'
import { CompareSummaryCards } from './CompareSummaryCards'
import { CompareTermsBlock } from './CompareTermsBlock'
import styles from './Styles.module.scss'
import type { CompareAnalysisPageProps } from './types'
import type { CompareTableExportType } from '../../../Models/analysis'

export function CompareAnalysisPage({
  compareDocumentAId,
  compareDocumentBId,
  compareResult,
  documents,
  errorMessage,
  isAnalyzing,
  isExporting,
  onAnalyze,
  onClear,
  onCsvExport,
  onOpenDocuments,
  onOpenFilePicker,
  onOpenSettings,
  onUploadFiles,
  onSelectDocumentA,
  onSelectDocumentB,
  settings,
}: CompareAnalysisPageProps) {
  const [detail, setDetail] = useState<CompareTableExportType | null>(null)

  if (documents.length === 0) {
    return (
      <div className={`${appStyles.pageStack} ${appStyles.documentsPage} ${styles.comparePage}`}>
        <PageHeader
          title="Сравнительный анализ"
          text="Сравните два текста по SEO-метрикам, структуре и словарному составу"
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
            <b>Загрузите документы, чтобы сравнить тексты</b>
          </div>
        </section>
        </SilentDropUploadArea>
      </div>
    )
  }

  const result = compareResult?.result ?? null
  const sameDocumentSelected = Boolean(compareDocumentAId && compareDocumentBId && compareDocumentAId === compareDocumentBId)
  const canAnalyze = Boolean(compareDocumentAId && compareDocumentBId && !sameDocumentSelected && !isAnalyzing)
  const shouldFillEmptyState = !result && !sameDocumentSelected && !errorMessage

  return (
    <CompareShell fillViewport={shouldFillEmptyState}>
      <SilentDropUploadArea onUploadFiles={onUploadFiles}>
        <CompareDocumentSelector
          documentAId={compareDocumentAId}
          documentBId={compareDocumentBId}
          documents={documents}
          onSelectA={onSelectDocumentA}
          onSelectB={onSelectDocumentB}
        />
      </SilentDropUploadArea>

      <CompareSettingsBar compareResult={compareResult} settings={settings} onOpenSettings={onOpenSettings} />

      <div className={styles.actionRow}>
        <button className={`${appStyles.primaryButton} ${styles.compareActionButton}`} disabled={!canAnalyze} type="button" onClick={onAnalyze}>
          {isAnalyzing ? <RefreshCw size={17} /> : <Scale size={17} />}
          {isAnalyzing ? 'Сравниваем тексты...' : 'Сравнить'}
        </button>
        <button className={`${appStyles.secondaryButton} ${styles.compareActionButton}`} disabled={isAnalyzing} type="button" onClick={onClear}>
          <Trash2 size={17} />
          Очистить
        </button>
      </div>

      {sameDocumentSelected ? (
        <ErrorBanner message="Для сравнения выберите разные документы" />
      ) : null}

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      {compareResult && !compareResult.is_actual ? (
        <section className={appStyles.warningBanner}>
          <AlertTriangle size={20} />
          <div>
            <b>Результат может быть неактуален</b>
            <p>Документы или параметры были изменены после последнего сравнения</p>
          </div>
          <button className={appStyles.secondaryButton} disabled={!canAnalyze} type="button" onClick={onAnalyze}>
            <RefreshCw size={16} />
            Запустить сравнение заново
          </button>
        </section>
      ) : null}

      {!result ? (
        isAnalyzing ? (
          <EmptyState
            compact
            fill
            icon={<RefreshCw className={styles.loadingIcon} size={52} />}
            title="Сравниваем тексты..."
            text="Собираем SEO-метрики для текста A и референсного текста B."
          />
        ) : (
          <EmptyState
            compact
            fill
            icon={<BarChart3 size={52} />}
            title="Сравнение ещё не выполнено"
          />
        )
      ) : (
        <div className={styles.resultsStack}>
          <CompareSummaryCards result={result} />
          <CompareMetricsPanel result={result} />
          <div className={styles.twoColumnGrid}>
            <CompareKeywordsBlock
              isExporting={isExporting}
              onCsvExport={onCsvExport}
              onShowDetails={() => setDetail('keywords')}
              result={result}
            />
            <CompareSimilarityBlock result={result} />
          </div>
          <div className={styles.twoColumnGrid}>
            <CompareTermsBlock
              comparison={result.words_comparison}
              detail="words"
              isExporting={isExporting}
              kind="words"
              onCsvExport={onCsvExport}
              onShowDetails={() => setDetail('words')}
              result={result}
              title="Общие слова"
            />
            <CompareTermsBlock
              comparison={result.ngrams_comparison}
              detail="ngrams"
              isExporting={isExporting}
              kind="ngrams"
              onCsvExport={onCsvExport}
              onShowDetails={() => setDetail('ngrams')}
              result={result}
              title="Общие N-граммы"
            />
          </div>
        </div>
      )}

      {result && detail ? (
        <CompareDetailsModal
          detail={detail}
          isExporting={isExporting}
          onClose={() => setDetail(null)}
          onCsvExport={onCsvExport}
          result={result}
        />
      ) : null}
    </CompareShell>
  )
}

function CompareShell({ children, fillViewport }: { children: ReactNode; fillViewport?: boolean }) {
  return (
    <div className={`${appStyles.pageStack} ${appStyles.seoPage} ${styles.comparePage} ${fillViewport ? styles.comparePageFill : ''}`}>
      <PageHeader
        title="Сравнительный анализ"
        text="Сравните два текста по SEO-метрикам, структуре и словарному составу"
      />
      {children}
    </div>
  )
}

function EmptyState({
  actions,
  compact,
  fill,
  icon,
  text,
  title,
}: {
  actions?: ReactNode
  compact?: boolean
  fill?: boolean
  icon: ReactNode
  text?: string
  title: string
}) {
  return (
    <section className={`${styles.emptyState} ${compact ? styles.emptyStateCompact : ''} ${fill ? styles.emptyStateFill : ''}`}>
      {icon}
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
      {actions ? <div className={styles.emptyActions}>{actions}</div> : null}
    </section>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <section className={styles.errorBanner}>
      <AlertCircle size={20} />
      <p>{message}</p>
    </section>
  )
}
