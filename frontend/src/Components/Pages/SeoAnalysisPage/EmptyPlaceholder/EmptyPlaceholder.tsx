import { Inbox } from 'lucide-react'
import styles from '../../../../App/Styles.module.scss'

export function EmptyPlaceholder({ compact, fill, text = 'Пусто' }: { compact?: boolean; fill?: boolean; text?: string }) {
  return (
    <div className={`${styles.emptyPlaceholder} ${compact ? styles.emptyPlaceholderCompact : ''} ${fill ? styles.emptyPlaceholderFill : ''}`}>
      <Inbox size={22} />
      <span>{text}</span>
    </div>
  )
}
