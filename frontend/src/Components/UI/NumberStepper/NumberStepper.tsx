import { Minus, Plus } from 'lucide-react'
import styles from '../../../App/Styles.module.scss'

export function NumberStepper({
  min = 0,
  suffix,
  value,
  onChange,
}: {
  min?: number
  suffix?: string
  value: number
  onChange: (value: number) => void
}) {
  const safeValue = Number.isFinite(value) ? value : min

  return (
    <div className={styles.numberStepper}>
      <button
        aria-label="Уменьшить"
        disabled={safeValue <= min}
        type="button"
        onClick={() => onChange(Math.max(min, safeValue - 1))}
      >
        <Minus size={15} strokeWidth={2.75} />
      </button>
      <label>
        <input
          min={min}
          type="number"
          value={safeValue}
          onChange={(event) => onChange(Math.max(min, Number(event.target.value) || min))}
        />
        {suffix ? <span>{suffix}</span> : null}
      </label>
      <button
        aria-label="Увеличить"
        type="button"
        onClick={() => onChange(safeValue + 1)}
      >
        <Plus size={15} strokeWidth={2.75} />
      </button>
    </div>
  )
}
