import { useEffect, useState } from 'react'
import styles from '../../../App/Styles.module.scss'
import { SettingLabel } from '../SettingLabel'

export function SettingsTextareaField({
  maxLength,
  onChange,
  placeholder,
  subtitle,
  title,
  tooltip,
  value,
}: {
  maxLength: number
  onChange: (value: string) => void
  placeholder: string
  subtitle: string
  title: string
  tooltip: string
  value: string
}) {
  const [draftValue, setDraftValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) {
      setDraftValue(value)
    }
  }, [isFocused, value])

  return (
    <div className={styles.settingsField}>
      <SettingLabel
        text={subtitle}
        title={title}
        tooltip={tooltip}
      />
      <div className={styles.settingsTextareaWrap}>
        <textarea
          maxLength={maxLength}
          placeholder={placeholder}
          value={draftValue}
          onBlur={() => {
            setIsFocused(false)
            setDraftValue(value)
          }}
          onChange={(event) => {
            setDraftValue(event.target.value)
            onChange(event.target.value)
          }}
          onFocus={() => setIsFocused(true)}
        />
      </div>
    </div>
  )
}
