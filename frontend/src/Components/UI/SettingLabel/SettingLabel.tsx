import { Info } from 'lucide-react'
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import styles from '../../../App/Styles.module.scss'

export function SettingLabel({
  text,
  title,
  tooltip,
}: {
  text?: string
  title: string
  tooltip: string
}) {
  return (
    <div className={styles.settingLabel}>
      <span>
        <b>{title}</b>
        <InfoHint text={tooltip} />
      </span>
      {text ? <p>{text}</p> : null}
    </div>
  )
}

function InfoHint({ text }: { text: string }) {
  const hintRef = useRef<HTMLSpanElement | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties | undefined>()

  function showTooltip() {
    const hint = hintRef.current

    if (!hint) {
      return
    }

    const rect = hint.getBoundingClientRect()
    const tooltipWidth = Math.min(280, Math.max(180, window.innerWidth - 24))
    const left = Math.min(
      window.innerWidth - tooltipWidth - 12,
      Math.max(12, rect.left + rect.width / 2 - tooltipWidth / 2),
    )
    const shouldShowAbove = rect.bottom + 92 > window.innerHeight && rect.top > 104
    const top = shouldShowAbove ? Math.max(12, rect.top - 10) : Math.min(window.innerHeight - 12, rect.bottom + 10)

    setTooltipStyle({
      left,
      top,
      width: tooltipWidth,
      transform: shouldShowAbove ? 'translateY(-100%)' : 'none',
    })
  }

  function hideTooltip() {
    setTooltipStyle(undefined)
  }

  return (
    <span
      aria-label={text}
      className={styles.infoHint}
      ref={hintRef}
      tabIndex={0}
      onBlur={hideTooltip}
      onFocus={showTooltip}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <Info size={13} />
      {tooltipStyle ? (
        <span className={styles.infoTooltip} role="tooltip" style={tooltipStyle}>
          {text}
        </span>
      ) : null}
    </span>
  )
}
