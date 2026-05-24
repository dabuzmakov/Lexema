import { BarChart3 } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { CompareAnalysisResult, CompareMetricDiff } from '../../../Models/analysis'
import styles from './Styles.module.scss'
import { formatMetricValue, formatSignedNumber, metricTone, riskLabel } from './utils'

const metricLabels: Array<{ key: string; label: string; suffix?: string }> = [
  { key: 'word_count', label: 'Слова' },
  { key: 'char_count', label: 'Символы' },
  { key: 'unique_words', label: 'Уникальные слова' },
  { key: 'water_percent', label: 'Водность', suffix: '%' },
  { key: 'paragraphs_count', label: 'Абзацы' },
  { key: 'sentences_count', label: 'Предложения' },
  { key: 'avg_paragraph_length', label: 'Средняя длина абзаца' },
  { key: 'avg_sentence_length', label: 'Средняя длина предложения' },
]

export function CompareMetricsPanel({ result }: { result: CompareAnalysisResult }) {
  const rows = metricLabels
    .map((item) => ({ ...item, metric: result.metrics[item.key] }))
    .filter((item): item is { key: string; label: string; suffix?: string; metric: CompareMetricDiff } => Boolean(item.metric))

  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <h2>
          <BarChart3 size={18} />
          Сравнение метрик
        </h2>
      </header>
      <div className={styles.metricRows}>
        {rows.map((row) => (
          <MetricRow key={row.key} label={row.label} metric={row.metric} suffix={row.suffix} />
        ))}
        {result.spam_comparison ? (
          <div className={styles.metricRow}>
            <span className={styles.metricName}>Риск переспама</span>
            <b className={styles.metricPill}>{riskLabel(result.spam_comparison.a?.risk)}</b>
            <span
              className={styles.metricDiffBar}
              style={buildRiskScaleStyle(result.spam_comparison.a?.risk, result.spam_comparison.b?.risk)}
              aria-hidden="true"
            >
              <span className={styles.metricDiffSideA} />
              <span className={styles.metricDiffSideB} />
            </span>
            <b className={styles.metricPill}>{riskLabel(result.spam_comparison.b?.risk)}</b>
            <em className={styles.tone_neutral}>
              {formatSignedNumber(result.spam_comparison.diff_warnings ?? 0)}
            </em>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function MetricRow({
  label,
  metric,
  suffix = '',
}: {
  label: string
  metric: CompareMetricDiff
  suffix?: string
}) {
  const tone = metricTone(metric.diff)
  const scaleStyle = buildScaleStyle(metric)
  return (
    <div className={styles.metricRow}>
      <span className={styles.metricName}>{label}</span>
      <b className={styles.metricPill}>{formatMetricValue(metric.a, suffix)}</b>
      <span
        aria-hidden="true"
        className={styles.metricDiffBar}
        style={scaleStyle}
      >
        <span className={styles.metricDiffSideA} />
        <span className={styles.metricDiffSideB} />
      </span>
      <b className={styles.metricPill}>{formatMetricValue(metric.b, suffix)}</b>
      <em className={styles[`tone_${tone}`]}>
        {formatSignedNumber(Number(metric.diff ?? 0), suffix === '%' ? '%' : '')}
      </em>
    </div>
  )
}

function buildScaleStyle(metric: CompareMetricDiff) {
  const a = Math.abs(Number(metric.a ?? 0))
  const b = Math.abs(Number(metric.b ?? 0))
  const max = Math.max(a, b)

  return {
    '--metric-a': `${max > 0 ? a / max * 100 : 0}%`,
    '--metric-b': `${max > 0 ? b / max * 100 : 0}%`,
  } as CSSProperties
}

function buildRiskScaleStyle(riskA?: string | null, riskB?: string | null) {
  const a = riskScore(riskA)
  const b = riskScore(riskB)
  const maxRiskScore = 3

  return {
    '--metric-a': `${a / maxRiskScore * 100}%`,
    '--metric-b': `${b / maxRiskScore * 100}%`,
  } as CSSProperties
}

function riskScore(value?: string | null) {
  if (value === 'high') {
    return 3
  }
  if (value === 'medium') {
    return 2
  }
  if (value === 'low') {
    return 1
  }
  return 0
}
