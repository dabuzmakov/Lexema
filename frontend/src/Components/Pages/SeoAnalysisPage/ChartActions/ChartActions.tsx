import { Copy, Download, ImageDown, Maximize2 } from 'lucide-react'
import styles from '../../../../App/Styles.module.scss'

export function ChartActions({
  disabled,
  onCsv,
  onDetails,
  onMarkdown,
  onPng,
}: {
  disabled?: boolean
  onCsv?: () => void
  onDetails?: () => void
  onMarkdown?: () => void
  onPng?: () => void
}) {
  return (
    <>
      {onDetails ? (
        <button aria-label="Подробнее" className={styles.chartActionButton} title="Подробнее" type="button" onClick={onDetails}>
          <Maximize2 size={14} />
          <span>Детали</span>
        </button>
      ) : null}
      <button aria-label="PNG" className={styles.chartActionButton} disabled={!onPng} title="PNG" type="button" onClick={onPng}>
        <ImageDown size={14} />
        <span>PNG</span>
      </button>
      <button aria-label="Markdown" className={styles.chartActionButton} disabled={!onMarkdown} title="Markdown" type="button" onClick={onMarkdown}>
        <Copy size={14} />
        <span>MD</span>
      </button>
      <button aria-label="CSV" className={styles.chartActionButton} disabled={disabled || !onCsv} title="CSV" type="button" onClick={onCsv}>
        <Download size={14} />
        <span>CSV</span>
      </button>
    </>
  )
}
