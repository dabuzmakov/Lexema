import { FilePlus, Search, UploadCloud } from 'lucide-react'
import styles from '../../../../App/Styles.module.scss'
import { MAX_DOCUMENTS } from '../../../../Utils/lexemaConstants'

export function DocumentsToolbar({
  canUpload,
  documentSearch,
  documentsCount,
  hasDocuments,
  onCreate,
  onOpenFilePicker,
  onSearch,
}: {
  canUpload: boolean
  documentSearch: string
  documentsCount: number
  hasDocuments: boolean
  onCreate: () => void
  onOpenFilePicker: () => void
  onSearch: (value: string) => void
}) {
  return (
    <div className={styles.documentsToolbar}>
      <div className={styles.documentsToolbarMain}>
        <button className={styles.primaryButton} disabled={!canUpload} type="button" onClick={onOpenFilePicker}>
          <UploadCloud size={18} />
          Загрузить .txt
        </button>
        <button className={styles.secondaryButton} disabled={documentsCount >= MAX_DOCUMENTS} type="button" onClick={onCreate}>
          <FilePlus size={18} />
          Создать документ
        </button>
        {hasDocuments ? (
          <label className={styles.searchField}>
            <Search size={18} />
            <input placeholder="Поиск по документам..." value={documentSearch} onChange={(event) => onSearch(event.target.value)} />
          </label>
        ) : null}
      </div>
    </div>
  )
}
