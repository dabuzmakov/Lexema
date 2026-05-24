import { Settings2, SlidersHorizontal } from 'lucide-react'
import appStyles from '../../../App/Styles.module.scss'
import type { LastAnalysisResult, CompareAnalysisResult } from '../../../Models/analysis'
import type { AnalysisSettings } from '../../../Models/settings'
import styles from './Styles.module.scss'
import { isAnalysisSettings, stopWordsModeLabel } from './utils'

export function CompareSettingsBar({
  compareResult,
  settings,
  onOpenSettings,
}: {
  compareResult: LastAnalysisResult<CompareAnalysisResult> | null
  settings: AnalysisSettings
  onOpenSettings: () => void
}) {
  const usedSettings = isAnalysisSettings(compareResult?.params_snapshot)
    ? compareResult.params_snapshot
    : settings

  return (
    <section className={styles.settingsBar}>
      <div className={styles.settingsBarTitle}>
        <SlidersHorizontal size={18} />
        <b>Используемые параметры</b>
      </div>
      <div className={styles.settingsChips}>
        <span>Стоп-слова: {stopWordsModeLabel(usedSettings.stop_words.mode)}</span>
        <span>Лемматизация: {usedSettings.lemmatization ? 'Вкл.' : 'Откл.'}</span>
        <span>N-граммы: {usedSettings.ngrams.sizes.length ? usedSettings.ngrams.sizes.join(' / ') : 'Откл.'}</span>
        <span>Ключевые слова: {usedSettings.keywords.length}</span>
        <span>Порог переспама: {usedSettings.spam.threshold_percent}%</span>
      </div>
      <button className={appStyles.secondaryButton} type="button" onClick={onOpenSettings}>
        <Settings2 size={17} />
        Открыть параметры
      </button>
    </section>
  )
}
