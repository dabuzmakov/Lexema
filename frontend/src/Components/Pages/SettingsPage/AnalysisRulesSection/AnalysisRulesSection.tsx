import styles from '../../../../App/Styles.module.scss'
import type { AnalysisSettings } from '../../../../Models/settings'
import { NumberStepper } from '../../../UI/NumberStepper'
import { SettingLabel } from '../../../UI/SettingLabel'

export function AnalysisRulesSection({
  draft,
  onSetLemmatization,
  onSetSpamThreshold,
  onToggleNgramSize,
}: {
  draft: AnalysisSettings
  onSetLemmatization: (value: boolean) => void
  onSetSpamThreshold: (value: number) => void
  onToggleNgramSize: (value: number) => void
}) {
  return (
    <div className={styles.settingsAnalysisContent}>
      <div className={styles.settingsAnalysisRow}>
        <div className={styles.settingsAnalysisText}>
          <SettingLabel
            text="Приводить слова к начальной форме для более точного анализа"
            title="Лемматизация"
            tooltip="Лемматизация объединяет формы одного слова и делает частотность ближе к реальному SEO-смыслу"
          />
        </div>
        <div className={styles.settingsControlCell}>
          <button
            aria-pressed={draft.lemmatization}
            className={`${styles.toggle} ${draft.lemmatization ? styles.toggleActive : ''}`}
            type="button"
            onClick={() => onSetLemmatization(!draft.lemmatization)}
          >
            <span />
          </button>
        </div>
      </div>

      <div className={styles.settingsAnalysisRow}>
        <div className={styles.settingsAnalysisText}>
          <SettingLabel
            text="Фразы с превышением порога считаются потенциально нерелевантными"
            title="Порог переспама, %"
            tooltip="Порог помогает быстро находить чрезмерные повторы, которые могут ухудшать качество текста для SEO"
          />
        </div>
        <div className={styles.settingsControlCell}>
          <div className={styles.settingsSeoSpamControl}>
            <div>
              <NumberStepper
                min={0}
                suffix="%"
                value={draft.spam.threshold_percent}
                onChange={onSetSpamThreshold}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.settingsAnalysisRow}>
        <div className={styles.settingsAnalysisText}>
          <SettingLabel
            text="Учитывать последовательности слов при анализе"
            title="N-граммы"
            tooltip="N-граммы показывают устойчивые фразы и помогают увидеть поисковые формулировки, а не только отдельные слова"
          />
        </div>
        <div className={styles.settingsControlCell}>
          <div className={styles.settingsNgramControl}>
            <div className={styles.checkboxStack}>
              <label className={styles.checkboxLabel}>
                <input
                  checked={draft.ngrams.sizes.includes(2)}
                  className={styles.checkboxInput}
                  type="checkbox"
                  onChange={() => onToggleNgramSize(2)}
                />
                2-граммы
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  checked={draft.ngrams.sizes.includes(3)}
                  className={styles.checkboxInput}
                  type="checkbox"
                  onChange={() => onToggleNgramSize(3)}
                />
                3-граммы
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
