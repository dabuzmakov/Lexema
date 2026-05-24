import { Check } from 'lucide-react'
import styles from '../../../../App/Styles.module.scss'
import type { HighlightKind } from '../types'

const highlightLabels: Array<[HighlightKind, string]> = [
  ['keywords', 'Ключи'],
  ['stop', 'Стоп'],
  ['water', 'Водные'],
  ['mixed', 'Раскладка'],
]

export function TextHighlightControls({
  highlights,
  onToggle,
}: {
  highlights: Record<HighlightKind, boolean>
  onToggle: (kind: HighlightKind) => void
}) {
  return (
    <div className={styles.highlightControls}>
      {highlightLabels.map(([key, label]) => (
        <button
          className={`${styles.highlightToggle} ${highlights[key] ? styles.highlightToggleActive : ''}`}
          key={key}
          title={key === 'keywords' ? 'Ключевые слова' : key === 'stop' ? 'Стоп-слова' : key === 'water' ? 'Водные слова' : 'Смешанная раскладка'}
          type="button"
          onClick={() => onToggle(key)}
        >
          <i className={styles[`highlightDot_${key}`]} />
          <span className={styles.highlightToggleLabel}>{label}</span>
          <span className={styles.highlightToggleMark}>
            {highlights[key] ? <Check size={14} strokeWidth={3} /> : null}
          </span>
        </button>
      ))}
    </div>
  )
}
