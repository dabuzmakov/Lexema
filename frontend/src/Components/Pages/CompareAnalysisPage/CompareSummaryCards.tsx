import { Droplets, KeyRound, Sigma, Text } from 'lucide-react'
import type { ReactNode } from 'react'
import { pluralizeRu } from '../../../Utils/lexema'
import type { CompareAnalysisResult } from '../../../Models/analysis'
import styles from './Styles.module.scss'
import { formatSignedNumber, metricTone } from './utils'

export function CompareSummaryCards({ result }: { result: CompareAnalysisResult }) {
  const wordDiff = result.summary.word_count_diff ?? 0
  const uniqueDiff = result.summary.unique_words_diff ?? 0
  const waterDiff = result.summary.water_diff ?? 0
  const lexicalSimilarity = result.summary.cosine_similarity_percent
    ?? result.similarity?.cosine_similarity_percent
    ?? 0

  return (
    <section className={styles.summaryGrid}>
      <SummaryCard
        icon={<Text size={22} />}
        label="Разница по словам"
        value={`${formatSignedNumber(wordDiff)} ${pluralizeRu(wordDiff, ['слово', 'слова', 'слов'])}`}
        tone={metricTone(wordDiff)}
      />
      <SummaryCard
        icon={<KeyRound size={22} />}
        label="Уникальные слова"
        value={`${formatSignedNumber(uniqueDiff)} ${pluralizeRu(uniqueDiff, ['слово', 'слова', 'слов'])}`}
        tone={metricTone(uniqueDiff)}
      />
      <SummaryCard
        icon={<Droplets size={22} />}
        label="Разница по водности"
        value={formatSignedNumber(waterDiff, '%')}
        tone={metricTone(waterDiff)}
      />
      <SummaryCard
        icon={<Sigma size={22} />}
        label="Лексическое сходство"
        value={`${lexicalSimilarity}%`}
        tone="neutral"
      />
    </section>
  )
}

function SummaryCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: ReactNode
  label: string
  tone: 'positive' | 'negative' | 'neutral'
  value: string
}) {
  return (
    <article className={styles.summaryCard}>
      <span className={`${styles.summaryIcon} ${styles[`tone_${tone}`]}`}>{icon}</span>
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
    </article>
  )
}
