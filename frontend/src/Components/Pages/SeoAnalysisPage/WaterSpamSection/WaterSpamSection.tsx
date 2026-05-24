import { Gauge } from 'lucide-react'
import type { CSSProperties } from 'react'
import styles from '../../../../App/Styles.module.scss'
import { formatPercent } from '../../../../Utils/lexema'
import type { SeoResult } from '../../../../Models/analysis'
import { ResultSection } from '../ResultSection'

export function WaterSpamSection({
  result,
  spamRisk,
}: {
  result: SeoResult
  spamRisk: string
}) {
  return (
    <ResultSection
      icon={<Gauge size={18} />}
      title="Водность и переспам"
    >
      <WaterSpamBlock result={result} spamRisk={spamRisk} />
    </ResultSection>
  )
}

function WaterSpamBlock({ result, spamRisk }: { result: SeoResult; spamRisk: string }) {
  const riskPercent = result.summary.spam_level === 'high' ? 82 : result.summary.spam_level === 'medium' ? 52 : Math.min(28, result.summary.spam_warnings_count * 12)

  return (
    <div className={styles.waterSpamCompact}>
      <div className={styles.waterSpamGauge}>
        <div className={styles.coverageDonut} style={{ '--percent': `${result.water.percent}%` } as CSSProperties}>
          <span>{formatPercent(result.water.percent)}</span>
        </div>
        <h3>Водность текста</h3>
      </div>
      <div className={styles.waterSpamGauge}>
        <div className={styles.coverageDonut} style={{ '--percent': `${riskPercent}%` } as CSSProperties}>
          <span className={result.summary.spam_level === 'high' ? styles.metric_danger : result.summary.spam_level === 'medium' ? styles.metric_warning : styles.metric_success}>
            {spamRisk}
          </span>
        </div>
        <h3>Риск переспама</h3>
      </div>
    </div>
  )
}
