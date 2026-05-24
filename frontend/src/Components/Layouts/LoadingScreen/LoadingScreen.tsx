import styles from '../../../App/Styles.module.scss'
import { LogoMark } from '../../UI/LogoMark'

export function LoadingScreen() {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.logoMark}>
        <LogoMark />
      </div>
      <p>Ð—Ð°Ð³Ñ€ÑƒÐ¶Ð°ÐµÐ¼ Ð›ÐµÐºÑÐµÐ¼Ñƒ...</p>
    </div>
  )
}
