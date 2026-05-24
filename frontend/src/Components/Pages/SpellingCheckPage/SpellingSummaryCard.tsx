import { AlertCircle, FileText, Languages, ListChecks, Type } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatNumber } from '../../../Utils/lexema'
import type { SpellingResult } from '../../../Models/analysis'
import { SPELLING_CATEGORY_META, SPELLING_CATEGORY_ORDER, getLanguageLabel } from './constants'
import styles from './Styles.module.scss'

export function SpellingSummaryCard({
  checkedChars,
  checkedWords,
  counts,
  result,
}: {
  checkedChars: number
  checkedWords: number
  counts: Record<string, number>
  result: SpellingResult | null
}) {
  const summary = result?.summary
  const total = summary?.total_issues ?? SPELLING_CATEGORY_ORDER.reduce((sum, category) => sum + (counts[category] ?? 0), 0)
  const segments = buildDonutSegments(counts, total)

  return (
    <section className={`${styles.panel} ${styles.summaryCombinedCard}`}>
      <div className={styles.panelHeader}>
        <div>
          <h2>
            <ListChecks size={18} />
            Общая сводка
          </h2>
        </div>
      </div>

      <div className={styles.summaryMetaGrid}>
        <SummaryMetaTile
          icon={<Languages size={16} />}
          label="Языки"
          value={(summary?.languages ?? []).map(getLanguageLabel).join(', ') || 'Не определены'}
        />
        <SummaryMetaTile icon={<FileText size={16} />} label="Слова" value={formatNumber(checkedWords)} />
        <SummaryMetaTile icon={<Type size={16} />} label="Символы" value={formatNumber(checkedChars)} />
        <SummaryMetaTile
          icon={<AlertCircle size={16} />}
          label="Ошибок найдено"
          value={formatNumber(total)}
        />
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
              const percent = total > 0 ? Math.round(value / total * 100) : 0

              return (
                <div className={styles.distributionLegendRow} key={category}>
                  <span>
                    <i style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                  <div className={styles.distributionLegendValue}>
                    <b>{formatNumber(value)}</b>
                    <small>{percent}%</small>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function SummaryMetaTile({
  icon,
  label,
  value,
}: {
  icon?: ReactNode
  label: string
  value: string
}) {
  return (
    <div className={styles.summaryMetaTile}>
      <span>
        {icon}
        {label}
      </span>
      <b title={value}>{value}</b>
    </div>
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
