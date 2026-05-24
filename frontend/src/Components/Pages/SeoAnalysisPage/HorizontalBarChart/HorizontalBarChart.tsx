import styles from '../../../../App/Styles.module.scss'
import { formatNumber } from '../../../../Utils/lexema'
import { EmptyPlaceholder } from '../EmptyPlaceholder'
import type { ChartRow } from '../types'

export function HorizontalBarChart({ expanded, rows }: { expanded?: boolean; rows: ChartRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  if (rows.length === 0) {
    return (
      <div className={styles.seoBarChartEmpty}>
        <EmptyPlaceholder fill />
      </div>
    )
  }

  return (
    <div className={`${styles.seoBarChart} ${expanded ? styles.seoBarChartExpanded : ''}`}>
      {rows.map((row) => (
        <div className={styles.seoBarRow} key={`${row.label}-${row.meta ?? ''}`}>
          <span>{row.label}</span>
          <div>
            <i style={{ width: `${Math.max(3, (row.value / max) * 100)}%` }} />
          </div>
          <b>{formatNumber(row.value)}</b>
          {row.meta ? <small>{row.meta}</small> : null}
        </div>
      ))}
    </div>
  )
}
