import styles from '../../../App/Styles.module.scss'
import logoUrl from './logo.svg'

export function LogoMark() {
  return <img alt="" aria-hidden="true" className={styles.logoIcon} src={logoUrl} />
}
