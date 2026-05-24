import styles from '../../../../App/Styles.module.scss'
import type { ResultSectionProps } from '../types'

export function ResultSection({
  actions,
  actionsPosition = 'header',
  children,
  icon,
  title,
  wide,
}: ResultSectionProps) {
  return (
    <section className={`${styles.card} ${styles.seoResultCard} ${wide ? styles.seoResultCardWide : ''}`}>
      <div className={styles.seoResultHeader}>
        <h2 className={styles.seoHeaderTitle}>
          {icon}
          <span className={styles.seoHeaderText}>{title}</span>
        </h2>
        {actions && actionsPosition === 'header' ? <div className={styles.seoActionGroup}>{actions}</div> : null}
      </div>
      {children}
      {actions && actionsPosition === 'footer' ? <div className={styles.seoResultFooterActions}>{actions}</div> : null}
    </section>
  )
}
