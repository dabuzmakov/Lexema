import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { CompareInsight } from '../../../Models/analysis'
import styles from './Styles.module.scss'

export function CompareInsightsBlock({ insights = [] }: { insights?: CompareInsight[] }) {
  if (insights.length === 0) {
    return null
  }

  return (
    <section className={styles.insightsBlock}>
      <h2>Выводы</h2>
      <div className={styles.insightGrid}>
        {insights.map((insight, index) => {
          const Icon = iconForType(insight.type)
          return (
            <article className={`${styles.insightCard} ${styles[`insight_${insight.type}`] ?? ''}`} key={`${insight.code ?? insight.type}-${index}`}>
              <Icon size={19} />
              <p>{insight.message}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function iconForType(type: string) {
  if (type === 'warning') {
    return AlertTriangle
  }
  if (type === 'success') {
    return CheckCircle2
  }
  if (type === 'error') {
    return XCircle
  }
  return Info
}
