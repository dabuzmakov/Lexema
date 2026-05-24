import { Layers } from 'lucide-react'
import styles from '../../../../App/Styles.module.scss'
import { formatCount, formatNumber } from '../../../../Utils/lexema'
import type { SeoStructure } from '../../../../Models/analysis'
import { EmptyPlaceholder } from '../EmptyPlaceholder'
import { ResultSection } from '../ResultSection'

export function StructureSection({
  structure,
}: {
  structure?: SeoStructure
}) {
  return (
    <ResultSection
      icon={<Layers size={18} />}
      wide
      title="Структурный анализ"
    >
      <StructureBlock structure={structure} />
    </ResultSection>
  )
}

function StructureBlock({ structure }: { structure?: SeoStructure }) {
  if (!structure || structure.words_count === 0) {
    return <EmptyPlaceholder />
  }

  return (
    <div className={styles.structureGrid}>
      <div className={styles.structureMetrics}>
        <MiniMetric label="Всего абзацев" value={structure.paragraphs_count} />
        <MiniMetric label="Всего предложений" value={structure.sentences_count} />
        <MiniMetric label="Средняя длина абзаца" value={formatCount(structure.avg_words_per_paragraph, ['слово', 'слова', 'слов'])} />
        <MiniMetric label="Средняя длина предложения" value={formatCount(structure.avg_words_per_sentence, ['слово', 'слова', 'слов'])} />
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  const words = label.split(' ')
  const labelLines = words.length <= 2
    ? [words[0], words.slice(1).join(' ')]
    : [words.slice(0, 2).join(' '), words.slice(2).join(' ')]

  return (
    <div className={styles.structureMetric}>
      <span className={styles.structureMetricLabel}>
        {labelLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
      <b>{typeof value === 'number' ? formatNumber(value) : value}</b>
    </div>
  )
}
