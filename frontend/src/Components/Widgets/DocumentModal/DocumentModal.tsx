import { FilePlus, X } from 'lucide-react'
import type { FormEvent } from 'react'
import styles from '../../../App/Styles.module.scss'
import { useLockBodyScroll } from '../../../Hooks/useLockBodyScroll'
import type { DocumentModalState } from '../../../Models/ui'

export function DocumentModal({
  isSaving,
  modal,
  onChange,
  onClose,
  onSubmit,
}: {
  isSaving: boolean
  modal: DocumentModalState
  onChange: (modal: DocumentModalState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  useLockBodyScroll()

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <form className={styles.modal} aria-label={modal.mode === 'edit' ? 'Редактировать документ' : 'Создать документ'} onSubmit={onSubmit}>
        <div className={styles.modalHeader}>
          <h2>
            {modal.mode === 'create' ? <FilePlus size={22} /> : null}
            {modal.mode === 'edit' ? 'Редактировать документ' : 'Создать документ'}
          </h2>
          <button aria-label="Закрыть" type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <label>
          Название
          <input
            autoFocus
            value={modal.title}
            onChange={(event) => onChange({ ...modal, title: event.target.value })}
          />
        </label>
        <label>
          Текст
          <textarea
            value={modal.content}
            onChange={(event) => onChange({ ...modal, content: event.target.value })}
          />
        </label>
        <div className={styles.modalActions}>
          <button className={styles.secondaryButton} type="button" onClick={onClose}>
            Отмена
          </button>
          <button className={styles.primaryButton} disabled={isSaving} type="submit">
            {isSaving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  )
}
