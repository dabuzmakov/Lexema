import type { ChangeEvent, ReactNode, RefObject } from 'react'
import styles from '../../../App/Styles.module.scss'
import type { TabId } from '../../../Models/ui'
import { Toast, type ToastMessage } from '../../UI/Toast'
import { Sidebar } from '../Sidebar'

export function AppShell({
  activeTab,
  canUpload,
  children,
  documentCount,
  fileInputRef,
  modalSlot,
  message,
  onFileInput,
  onOpenFilePicker,
  onSetActiveTab,
  onUploadFiles,
}: {
  activeTab: TabId
  canUpload: boolean
  children: ReactNode
  documentCount: number
  fileInputRef: RefObject<HTMLInputElement | null>
  modalSlot?: ReactNode
  message: ToastMessage | null
  onFileInput: (event: ChangeEvent<HTMLInputElement>) => void
  onOpenFilePicker: () => void
  onSetActiveTab: (tab: TabId) => void
  onUploadFiles: (files: FileList | File[]) => void
}) {
  return (
    <div className={styles.shell}>
      <input
        ref={fileInputRef}
        className={styles.hiddenInput}
        type="file"
        accept=".txt,text/plain"
        multiple
        onChange={onFileInput}
      />

      {message ? <Toast message={message} /> : null}

      <Sidebar
        activeTab={activeTab}
        canUpload={canUpload}
        documentCount={documentCount}
        onOpenFilePicker={onOpenFilePicker}
        onSetActiveTab={onSetActiveTab}
        onUploadFiles={onUploadFiles}
      />

      <div className={styles.workspace}>
        <main className={styles.content}>{children}</main>
      </div>

      {modalSlot}
    </div>
  )
}
