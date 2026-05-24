import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import styles from '../../../../App/Styles.module.scss'
import type { LastAnalysisResult, SeoKeywordRow, SeoNgramRow, SeoResult, SeoTableExportType, SeoWordRow } from '../../../../Models/analysis'
import type { DocumentItem } from '../../../../Models/documents'
import type { AnalysisSettings } from '../../../../Models/settings'
import { ChartDetailsModal } from '../ChartDetailsModal'
import { KeywordSection } from '../KeywordSection'
import { MixedAlphabetSection } from '../MixedAlphabetSection'
import { SeoMetricCards } from '../SeoMetricCards'
import { StructureSection } from '../StructureSection'
import { TextAnalysisPreview } from '../TextAnalysisPreview'
import { TopNgramsSection } from '../TopNgramsSection'
import { TopWordsSection } from '../TopWordsSection'
import { WaterSpamSection } from '../WaterSpamSection'
import type { DetailKind } from '../types'
import { translateRisk } from '../utils'

export function SeoReport({
  isExporting,
  onAnalyze,
  onCopyKeywordsMarkdown,
  onCopyNgramsMarkdown,
  onCopyWordsMarkdown,
  onCsvExport,
  result,
  selectedDocuments,
  seoResult,
  settings,
}: {
  isExporting: boolean
  onAnalyze: () => void
  onCopyKeywordsMarkdown: (rows: SeoKeywordRow[]) => void
  onCopyNgramsMarkdown: (rows: SeoNgramRow[]) => void
  onCopyWordsMarkdown: (rows: SeoWordRow[]) => void
  onCsvExport: (type: SeoTableExportType) => void
  result: SeoResult
  selectedDocuments: DocumentItem[]
  seoResult: LastAnalysisResult<SeoResult>
  settings: AnalysisSettings
}) {
  const [detail, setDetail] = useState<DetailKind | null>(null)
  const primaryGridRef = useRef<HTMLDivElement | null>(null)
  const insightsRef = useRef<HTMLDivElement | null>(null)
  const structure = result.structure
  const spamRisk = translateRisk(result.summary.spam_level)
  const topWordRows = result.words.slice(0, 6)
  const ngramRows = result.ngrams.slice(0, 6)
  const mixedRows = result.mixed_alphabet_words

  useEffect(() => {
    const grid = primaryGridRef.current
    const element = insightsRef.current

    if (!grid || !element) {
      return
    }

    const measuredGrid = grid
    const measuredElement = element

    function syncHeight() {
      const isSingleColumn = window.matchMedia('(max-width: 1180px)').matches

      if (isSingleColumn) {
        measuredGrid.style.removeProperty('--seo-primary-height')
        return
      }

      const cards = Array.from(measuredElement.children) as HTMLElement[]
      const gap = Number.parseFloat(window.getComputedStyle(measuredElement).rowGap) || 0
      const cardsHeight = cards.reduce((sum, card) => sum + card.getBoundingClientRect().height, 0)
      const totalGap = Math.max(0, cards.length - 1) * gap

      measuredGrid.style.setProperty('--seo-primary-height', `${Math.ceil(cardsHeight + totalGap)}px`)
    }

    syncHeight()

    const observer = new ResizeObserver(syncHeight)
    observer.observe(measuredElement)
    Array.from(measuredElement.children).forEach((child) => observer.observe(child))
    window.addEventListener('resize', syncHeight)
    window.addEventListener('orientationchange', syncHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncHeight)
      window.removeEventListener('orientationchange', syncHeight)
      measuredGrid.style.removeProperty('--seo-primary-height')
    }
  }, [ngramRows.length, topWordRows.length])

  return (
    <div className={styles.seoDashboard}>
      {!seoResult.is_actual ? (
        <section className={styles.warningBanner}>
          <AlertTriangle size={20} />
          <div>
            <b>Результат может быть неактуален</b>
            <p>Документы или параметры были изменены после последнего анализа</p>
          </div>
          <button className={styles.secondaryButton} type="button" onClick={onAnalyze}>
            <RefreshCw size={16} />
            Обновить анализ
          </button>
        </section>
      ) : null}

      <SeoMetricCards result={result} />

      <div
        ref={primaryGridRef}
        className={styles.seoPrimaryGrid}
      >
        <TextAnalysisPreview
          result={result}
          selectedDocuments={selectedDocuments}
          settings={settings}
        />

        <div className={styles.seoInsightsStack} ref={insightsRef}>
          <TopWordsSection
            isExporting={isExporting}
            onCopyMarkdown={onCopyWordsMarkdown}
            onCsvExport={onCsvExport}
            onShowDetails={() => setDetail('words')}
            rows={topWordRows}
          />

          <TopNgramsSection
            isExporting={isExporting}
            onCopyMarkdown={onCopyNgramsMarkdown}
            onCsvExport={onCsvExport}
            onShowDetails={() => setDetail('ngrams')}
            rows={ngramRows}
          />
        </div>
      </div>

      <div className={styles.seoResultGrid}>
        <KeywordSection
          isExporting={isExporting}
          onCopyMarkdown={onCopyKeywordsMarkdown}
          onCsvExport={onCsvExport}
          onShowDetails={() => setDetail('keywords')}
          result={result}
        />

        <WaterSpamSection
          result={result}
          spamRisk={spamRisk}
        />

        <StructureSection
          structure={structure}
        />

        <MixedAlphabetSection
          result={result}
          rows={mixedRows}
        />
      </div>

      {detail ? (
        <ChartDetailsModal
          detail={detail}
          isExporting={isExporting}
          onClose={() => setDetail(null)}
          onCsvExport={onCsvExport}
          result={result}
        />
      ) : null}
    </div>
  )
}
