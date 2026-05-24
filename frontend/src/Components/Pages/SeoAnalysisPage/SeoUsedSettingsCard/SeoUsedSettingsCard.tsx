import { Settings2, SlidersHorizontal } from 'lucide-react'
import styles from '../../../../App/Styles.module.scss'
import { stopWordsLabels } from '../../../../Utils/lexemaConstants'
import { formatCount } from '../../../../Utils/lexema'
import type { AnalysisSettings } from '../../../../Models/settings'

export function SeoUsedSettingsCard({
  settings,
  onOpenSettings,
}: {
  settings: AnalysisSettings
  onOpenSettings: () => void
}) {
  return (
    <section className={`${styles.card} ${styles.seoControlCard} ${styles.seoSettingsControlCard}`}>
      <div className={styles.seoBlockHeader}>
        <div>
          <h2 className={styles.seoHeaderTitle}>
            <SlidersHorizontal size={18} />
            Используемые параметры
          </h2>
        </div>
      </div>
      <div className={styles.seoSettingsRows}>
        <InfoRow label="Режим стоп-слов" value={stopWordsLabels[settings.stop_words.mode]} />
        <InfoRow label="Лемматизация" value={settings.lemmatization ? 'Включена' : 'Отключена'} />
        <InfoRow label="N-граммы" value={settings.ngrams.sizes.length ? settings.ngrams.sizes.join(' / ') : 'Отключены'} />
        <InfoRow label="Ключевые слова" value={settings.keywords.length ? formatCount(settings.keywords.length, ['ключ', 'ключа', 'ключей']) : 'Не заданы'} />
        <InfoRow label="Порог переспама" value={`${settings.spam.threshold_percent}%`} />
      </div>
      <button className={styles.secondaryButtonWide} type="button" onClick={onOpenSettings}>
        <Settings2 size={17} />
        Открыть параметры
      </button>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.seoInfoRow}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}
