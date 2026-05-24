import { BarChart3, Lock } from 'lucide-react'
import styles from '../../../App/Styles.module.scss'
import { PageHeader } from '../../Layouts/PageHeader'
import { SilentDropUploadArea } from '../../Widgets/SilentDropUploadArea'
import { SeoDocumentPicker } from './SeoDocumentPicker'
import { SeoReport } from './SeoReport'
import { SeoUsedSettingsCard } from './SeoUsedSettingsCard'
import { SeoWelcomeState } from './SeoWelcomeState'
import type { SeoAnalysisPageProps } from './types'

export function SeoAnalysisPage({
  documents,
  isAnalyzing,
  isExporting,
  onAnalyze,
  onCopyKeywordsMarkdown,
  onCopyNgramsMarkdown,
  onCopyWordsMarkdown,
  onCsvExport,
  onOpenFilePicker,
  onOpenSettings,
  onUploadFiles,
  onSelectAll,
  onSelectNone,
  onToggleDocument,
  selectedDocumentIds,
  selectedDocuments,
  seoResult,
  settings,
}: SeoAnalysisPageProps) {
  if (documents.length === 0) {
    return <SeoWelcomeState onOpenFilePicker={onOpenFilePicker} onUploadFiles={onUploadFiles} />
  }

  const result = seoResult?.result

  return (
    <div className={`${styles.pageStack} ${styles.seoPage}`}>
      <PageHeader
        title="SEO-анализ"
        text="Быстрая проверка текста по SEO-метрикам"
      />

      <div className={styles.analysisTopGrid}>
        <SilentDropUploadArea onUploadFiles={onUploadFiles}>
          <SeoDocumentPicker
            documents={documents}
            isAnalyzing={isAnalyzing}
            onAnalyze={onAnalyze}
            onSelectAll={onSelectAll}
            onSelectNone={onSelectNone}
            onToggleDocument={onToggleDocument}
            selectedDocumentIds={selectedDocumentIds}
          />
        </SilentDropUploadArea>
        <SeoUsedSettingsCard settings={settings} onOpenSettings={onOpenSettings} />
      </div>

      {!result ? (
        <>
          <section className={styles.emptyReport}>
            <BarChart3 size={68} />
            <h2>SEO-анализ еще не выполнен</h2>
            <p>
              Выберите документы и нажмите «Анализировать», чтобы получить частотность,
              ключевые фразы, водность, переспам и структуру текста.
            </p>
          </section>
          <LockedSections />
        </>
      ) : (
        <SeoReport
          isExporting={isExporting}
          onAnalyze={onAnalyze}
          onCopyKeywordsMarkdown={onCopyKeywordsMarkdown}
          onCopyNgramsMarkdown={onCopyNgramsMarkdown}
          onCopyWordsMarkdown={onCopyWordsMarkdown}
          onCsvExport={onCsvExport}
          result={result}
          selectedDocuments={selectedDocuments}
          seoResult={seoResult}
          settings={settings}
        />
      )}
    </div>
  )
}

function LockedSections() {
  return (
    <div className={styles.lockedList}>
      {['Сводка', 'Анализируемый текст', 'Топ слов', 'Топ N-грамм', 'Ключевые слова', 'Структура'].map((item) => (
        <div className={styles.lockedRow} key={item}>
          <Lock size={18} />
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}
