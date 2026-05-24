import { ChartPie } from 'lucide-react'
import { formatCount, formatNumber } from '../../../Utils/lexema'
import { SPELLING_CATEGORY_META, SPELLING_CATEGORY_ORDER } from './constants'
import styles from './Styles.module.scss'

export function SpellingDistributionCard({ counts }: { counts: Record<string, number> }) {
  const total = SPELLING_CATEGORY_ORDER.reduce((sum, category) => sum + (counts[category] ?? 0), 0)
  const segments = buildDonutSegments(counts, total)

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>
            <ChartPie size={18} />
            Распределение по типам
          </h2>
          <p>{total > 0 ? formatCount(total, ['ошибка', 'ошибки', 'ошибок']) : 'Ошибок не найдено'}</p>
        </div>
      </div>

      {total === 0 ? (
        <div className={styles.resultPlaceholder}>Ошибок не найдено</div>
      ) : (
        <div className={styles.distributionDonutLayout}>
          <div
            className={styles.distributionDonut}
            style={{ background: `conic-gradient(${segments.join(', ')})` }}
            aria-hidden="true"
          >
            <div>
              <b>{formatNumber(total)}</b>
              <span>всего</span>
            </div>
          </div>

          <div className={styles.distributionLegendRows}>
            {SPELLING_CATEGORY_ORDER.map((category) => {
              const value = counts[category] ?? 0
              const meta = SPELLING_CATEGORY_META[category]
              const percent = Math.round(value / total * 100)

              return (
                <div className={styles.distributionLegendRow} key={category}>
                  <span>
                    <i style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                  <b>{formatNumber(value)}</b>
                  <small>{percent}%</small>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function buildDonutSegments(counts: Record<string, number>, total: number) {
  if (total <= 0) {
    return []
  }

  let cursor = 0

  return SPELLING_CATEGORY_ORDER
    .map((category) => {
      const value = counts[category] ?? 0
      if (value <= 0) {
        return null
      }

      const start = cursor / total * 360
      cursor += value
      const end = cursor / total * 360
      return `${SPELLING_CATEGORY_META[category].color} ${start}deg ${end}deg`
    })
    .filter((segment): segment is string => Boolean(segment))
}
