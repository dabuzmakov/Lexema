import { Network } from 'lucide-react'
import type { CSSProperties } from 'react'
import { formatPercent } from '../../../Utils/lexema'
import type { CompareAnalysisResult } from '../../../Models/analysis'
import styles from './Styles.module.scss'

const similarityItems = [
  { key: 'vocabulary_overlap_percent', label: 'Словарное пересечение' },
  { key: 'ngram_overlap_percent', label: 'N-граммное пересечение' },
  { key: 'cosine_similarity_percent', label: 'Лексическое сходство' },
] as const

export function CompareSimilarityBlock({ result }: { result: CompareAnalysisResult }) {
  const similarity = result.similarity

  if (!similarity) {
    return null
  }

  return (
    <section className={`${styles.panel} ${styles.similarityPanel}`}>
      <header className={styles.panelHeader}>
        <h2>
          <Network size={18} />
          Сходство текстов
        </h2>
      </header>
      <div className={styles.similarityGrid}>
        {similarityItems.map((item) => {
          const value = Number(similarity[item.key] ?? 0)
          const normalized = Math.max(0, Math.min(100, value))
          return (
            <div className={styles.similarityItem} key={item.key}>
              <div className={styles.similarityDial} style={{ '--percent': `${normalized}%` } as CSSProperties}>
                <b>{formatPercent(value)}</b>
              </div>
              <div className={styles.similarityContent}>
                <span>{item.label}</span>
                <i>
                  <em style={{ width: `${normalized}%` }} />
                </i>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
