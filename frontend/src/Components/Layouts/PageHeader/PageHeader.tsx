import styles from '../../../App/Styles.module.scss'

export function PageHeader({ title, text }: { title: string; text: string }) {
  return (
    <header className={styles.PageHeader}>
      <h1>{title}</h1>
      <p>{text}</p>
    </header>
  )
}
