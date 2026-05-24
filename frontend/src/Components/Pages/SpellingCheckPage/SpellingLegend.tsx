import type { SpellingCategory } from '../../../Models/analysis'
import { SPELLING_CATEGORY_META, SPELLING_CATEGORY_ORDER } from './constants'
import styles from './Styles.module.scss'

export function SpellingLegend({ counts }: { counts: Record<string, number> }) {
  return (
    <div className={styles.legend}>
      {SPELLING_CATEGORY_ORDER.map((category) => {
        const meta = SPELLING_CATEGORY_META[category]
        return (
          <span key={category}>
            <i style={{ background: meta.color }} />
            {meta.label}
            <b>{counts[category as SpellingCategory] ?? 0}</b>
          </span>
        )
      })}
    </div>
  )
}
