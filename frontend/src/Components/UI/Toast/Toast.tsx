import { Check } from 'lucide-react'
import styles from '../../../App/Styles.module.scss'

export type ToastMessage = {
  text: string
  variant?: 'copy' | 'info'
}

export function Toast({ message }: { message: ToastMessage }) {
  return (
    <div className={`${styles.toast} ${message.variant === 'copy' ? styles.copyFeedback : ''}`} role="status">
      {message.variant === 'copy' ? <Check size={15} /> : null}
      <span>{message.text}</span>
    </div>
  )
}
