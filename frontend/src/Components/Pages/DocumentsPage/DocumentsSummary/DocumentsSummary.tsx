import { FileText, Languages, ListChecks, StickyNote } from 'lucide-react'
import styles from '../../../../App/Styles.module.scss'
import { formatApproxPages, formatNumber } from '../../../../Utils/lexema'

export function DocumentsSummary({
  chars,
  documentsCount,
  words,
}: {
  chars: number
  documentsCount: number
  words: number
}) {
  return (
    <aside className={`${styles.card} ${styles.corpusSummaryCard}`}>
      <div className={styles.corpusSummaryTitle}>
        <StickyNote size={20} />
        <h2>Общая сводка</h2>
      </div>
      <div className={styles.corpusSummaryStat}>
        <span className={styles.summaryIconBubble}>
          <span className={styles.summaryIconCenter}>
            <FileText size={30} />
          </span>
        </span>
        <div>
          <span>Всего документов</span>
          <b>{documentsCount}</b>
          <small>из 30</small>
        </div>
      </div>
      <div className={styles.corpusSummaryStat}>
        <span className={styles.summaryIconBubble}>
          <span className={styles.summaryIconCenter}>
            <ListChecks size={30} />
          </span>
        </span>
        <div>
          <span>Всего слов</span>
          <b>{formatNumber(words)}</b>
          <small>{formatApproxPages(words)}</small>
        </div>
      </div>
      <div className={styles.corpusSummaryStat}>
        <span className={styles.summaryIconBubble}>
          <span className={styles.summaryIconCenter}>
            <Languages size={30} />
          </span>
        </span>
        <div>
          <span>Всего символов</span>
          <b>{formatNumber(chars)}</b>
        </div>
      </div>
    </aside>
  )
}
