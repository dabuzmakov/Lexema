import { FileText, Hash, Layers } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from '../../../../App/Styles.module.scss'
import { formatNumber } from '../../../../Utils/lexema'
import type { SeoResult } from '../../../../Models/analysis'

export function SeoMetricCards({ result }: { result: SeoResult }) {
  return (
    <div className={styles.seoSummaryGrid}>
      <MetricCard
        icon={<FileText size={19} />}
        label="Документов"
        value={result.summary.documents_count}
      />
      <MetricCard icon={<Hash size={19} />} label="Всего слов" value={result.summary.total_words} />
      <MetricCard icon={<Layers size={19} />} label="Уникальных слов" value={result.summary.unique_words} />
    </div>
  )
}

function MetricCard({
  caption,
  icon,
  label,
  tone,
  value,
}: {
  caption?: string
  icon: ReactNode
  label: string
  tone?: 'success' | 'warning' | 'danger'
  value: number | string
}) {
  return (
    <article className={styles.seoMetricCard}>
      <span className={styles.seoMetricIcon}>{icon}</span>
      <div>
        <span>{label}</span>
        <b className={tone ? styles[`metric_${tone}`] : ''}>
          {typeof value === 'number' ? formatNumber(value) : value}
        </b>
        {caption ? <small>{caption}</small> : null}
      </div>
    </article>
  )
}
