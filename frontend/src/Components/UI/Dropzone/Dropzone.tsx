import { UploadCloud } from 'lucide-react'
import type { DragEvent } from 'react'
import styles from '../../../App/Styles.module.scss'

export function Dropzone({
  compact,
  disabled,
  onOpenFilePicker,
  onUploadFiles,
}: {
  compact?: boolean
  disabled?: boolean
  onOpenFilePicker: () => void
  onUploadFiles: (files: FileList | File[]) => void
}) {
  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (!disabled) {
      onUploadFiles(event.dataTransfer.files)
    }
  }

  return (
    <button
      className={`${styles.dropzone} ${compact ? styles.dropzoneCompact : ''}`}
      disabled={disabled}
      type="button"
      onClick={onOpenFilePicker}
      onDragOver={(event) => {
        if (!disabled) {
          event.preventDefault()
        }
      }}
      onDrop={handleDrop}
    >
      <UploadCloud size={compact ? 30 : 46} />
      <strong>{compact ? 'Перетащите .txt' : 'Перетащите .txt файл сюда'}</strong>
      <span>{compact ? 'или выберите файл' : 'или нажмите для выбора'}</span>
      {!compact ? <small>Поддерживается только формат .txt, размер файла до 10 МБ</small> : null}
    </button>
  )
}
