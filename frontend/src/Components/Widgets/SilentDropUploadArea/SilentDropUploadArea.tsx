import type { DragEvent, ReactNode } from 'react'
import { useState } from 'react'
import styles from '../../../App/Styles.module.scss'

export function SilentDropUploadArea({
  children,
  disabled,
  onUploadFiles,
}: {
  children: ReactNode
  disabled?: boolean
  onUploadFiles: (files: FileList | File[]) => void
}) {
  const [isDragging, setIsDragging] = useState(false)

  function hasFiles(event: DragEvent<HTMLElement>) {
    return Array.from(event.dataTransfer.types).includes('Files')
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (disabled || !hasFiles(event)) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (disabled || !hasFiles(event)) {
      return
    }

    event.preventDefault()
    setIsDragging(false)
    onUploadFiles(event.dataTransfer.files)
  }

  return (
    <div
      className={`${styles.silentDropArea} ${isDragging ? styles.silentDropAreaActive : ''}`}
      onDragEnter={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
    </div>
  )
}
