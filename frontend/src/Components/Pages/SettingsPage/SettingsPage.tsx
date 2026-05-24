import { BookOpen, CheckCircle2, RefreshCw, TrendingUp } from 'lucide-react'
import styles from '../../../App/Styles.module.scss'
import type { AnalysisSettings, StopWordsMode } from '../../../Models/settings'
import { PageHeader } from '../../Layouts/PageHeader'
import { AnalysisRulesSection } from './AnalysisRulesSection'
import { KeywordsSection } from './KeywordsSection'
import { StopWordsSection } from './StopWordsSection'

export function SettingsPage({
  draft,
  isSaving,
  onReset,
  onSave,
  onSetKeywords,
  onSetLemmatization,
  onSetSpamThreshold,
  onSetStopWords,
  onSetStopWordsMode,
  onToggleNgramSize,
}: {
  draft: AnalysisSettings
  isSaving: boolean
  onReset: () => void
  onSave: () => void
  onSetKeywords: (value: string) => void
  onSetLemmatization: (value: boolean) => void
  onSetSpamThreshold: (value: number) => void
  onSetStopWords: (value: string) => void
  onSetStopWordsMode: (value: StopWordsMode) => void
  onToggleNgramSize: (value: number) => void
}) {
  return (
    <div className={`${styles.pageStack} ${styles.settingsPage}`}>
      <PageHeader
        title="Параметры"
        text="Настройте поведение анализа под ваши задачи"
      />

      <div className={styles.settingsLayout}>
        <div className={styles.settingsPanelGrid}>
          <section className={`${styles.settingsPanel} ${styles.settingsWordsPanel}`}>
            <div className={styles.settingsPanelTitle}>
              <span>
                <BookOpen size={19} />
              </span>
              <h2>Слова и фразы</h2>
            </div>

            <div className={styles.settingsWordsContent}>
              <StopWordsSection
                draft={draft}
                onSetStopWords={onSetStopWords}
                onSetStopWordsMode={onSetStopWordsMode}
              />

              <KeywordsSection
                draft={draft}
                onSetKeywords={onSetKeywords}
              />
            </div>
          </section>

          <section className={`${styles.settingsPanel} ${styles.settingsAnalysisPanel}`}>
            <div className={styles.settingsPanelTitle}>
              <span>
                <TrendingUp size={19} />
              </span>
              <h2>Настройки обработки</h2>
            </div>

            <AnalysisRulesSection
              draft={draft}
              onSetLemmatization={onSetLemmatization}
              onSetSpamThreshold={onSetSpamThreshold}
              onToggleNgramSize={onToggleNgramSize}
            />
          </section>
        </div>

        <div className={styles.formActions}>
          <button className={styles.primaryButton} disabled={isSaving} type="button" onClick={onSave}>
            <CheckCircle2 size={18} />
            {isSaving ? 'Сохраняем...' : 'Сохранить'}
          </button>
          <button className={styles.secondaryButton} type="button" onClick={onReset}>
            <RefreshCw size={18} />
            Сбросить
          </button>
        </div>
      </div>
    </div>
  )
}
