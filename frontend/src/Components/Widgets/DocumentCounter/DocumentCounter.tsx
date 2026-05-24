import styles from '../../../App/Styles.module.scss'
import { MAX_DOCUMENTS } from '../../../Utils/lexemaConstants'

export function DocumentCounter({ documentCount }: { documentCount: number }) {
  const progress = Math.min(100, (documentCount / MAX_DOCUMENTS) * 100)

  return (
    <div className={styles.documentUsage}>
      <div className={styles.usageLine}>
        <span>Документы</span>
        <b>{documentCount}/30</b>
      </div>
      <div className={styles.progressTrack}>
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
