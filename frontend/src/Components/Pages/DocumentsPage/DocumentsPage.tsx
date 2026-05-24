import {
  Download,
  FileText,
  FolderOpen,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import styles from '../../../App/Styles.module.scss'
import {
  MAX_DOCUMENT_ROW_HEIGHT,
  MIN_DOCUMENT_ROW_HEIGHT,
} from '../../../Utils/lexemaConstants'
import { formatDate, formatNumber } from '../../../Utils/lexema'
import type { DocumentItem } from '../../../Models/documents'
import type { DocumentSortKey, SortDirection } from '../../../Models/ui'
import { PageHeader } from '../../Layouts/PageHeader'
import { DocumentsPagination } from './DocumentsPagination'
import { DocumentsSummary } from './DocumentsSummary'
import { DocumentsToolbar } from './DocumentsToolbar'

export function DocumentsPage({
  canUpload,
  corpusSummary,
  documentSearch,
  documents,
  filteredDocuments,
  isSaving,
  onCreate,
  onDelete,
  onDeleteSelected,
  onEdit,
  onOpenFilePicker,
  onSearch,
  onSelect,
  onSelectAll,
  onUploadFiles,
  selectedDocumentIds,
}: {
  canUpload: boolean
  corpusSummary: { words: number; chars: number }
  documentSearch: string
  documents: DocumentItem[]
  filteredDocuments: DocumentItem[]
  isSaving: boolean
  onCreate: () => void
  onDelete: (id: string) => void
  onDeleteSelected: () => void
  onEdit: (document: DocumentItem) => void
  onOpenFilePicker: () => void
  onSearch: (value: string) => void
  onSelect: (id: string) => void
  onSelectAll: (checked: boolean) => void
  onUploadFiles: (files: FileList | File[]) => void
  selectedDocumentIds: string[]
}) {
  const hasDocuments = documents.length > 0
  const tableWrapRef = useRef<HTMLDivElement | null>(null)
  const [documentsPerPage, setDocumentsPerPage] = useState(6)
  const [documentRowHeight, setDocumentRowHeight] = useState(78)
  const [currentPage, setCurrentPage] = useState(1)
  const [documentSort, setDocumentSort] = useState<{ key: DocumentSortKey; direction: SortDirection }>({
    key: 'updated_at',
    direction: 'desc',
  })
  const sortedDocuments = useMemo(() => {
    const directionFactor = documentSort.direction === 'asc' ? 1 : -1

    return [...filteredDocuments].sort((first, second) => {
      let result = 0

      if (documentSort.key === 'title') {
        result = first.title.localeCompare(second.title, 'ru', { sensitivity: 'base', numeric: true })
      } else if (documentSort.key === 'updated_at') {
        result =
          new Date(first.updated_at ?? first.created_at ?? 0).getTime() -
          new Date(second.updated_at ?? second.created_at ?? 0).getTime()
      } else {
        result = first[documentSort.key] - second[documentSort.key]
      }

      return result * directionFactor
    })
  }, [documentSort, filteredDocuments])
  const totalPages = Math.max(1, Math.ceil(sortedDocuments.length / documentsPerPage))
  const visibleDocuments = sortedDocuments.slice(
    (currentPage - 1) * documentsPerPage,
    currentPage * documentsPerPage,
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [documentSearch, documents.length, documentSort])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  useEffect(() => {
    const tableWrap = tableWrapRef.current

    if (!tableWrap || !hasDocuments) {
      return undefined
    }

    const updateDocumentsPerPage = () => {
      if (window.matchMedia('(max-width: 760px)').matches) {
        setDocumentsPerPage((current) => (current === 2 ? current : 2))
        setDocumentRowHeight((current) => (current === MIN_DOCUMENT_ROW_HEIGHT ? current : MIN_DOCUMENT_ROW_HEIGHT))
        return
      }

      const headerHeight = tableWrap.querySelector('thead')?.getBoundingClientRect().height ?? 50
      const availableHeight = Math.max(0, tableWrap.getBoundingClientRect().height - headerHeight - 1)
      const nextDocumentsPerPage = Math.max(1, Math.floor(availableHeight / MIN_DOCUMENT_ROW_HEIGHT))
      const nextDocumentRowHeight = Math.min(
        MAX_DOCUMENT_ROW_HEIGHT,
        Math.max(MIN_DOCUMENT_ROW_HEIGHT, availableHeight / nextDocumentsPerPage),
      )

      setDocumentsPerPage((current) => (current === nextDocumentsPerPage ? current : nextDocumentsPerPage))
      setDocumentRowHeight((current) =>
        Math.abs(current - nextDocumentRowHeight) < 0.5 ? current : nextDocumentRowHeight,
      )
    }

    updateDocumentsPerPage()

    const resizeObserver = new ResizeObserver(updateDocumentsPerPage)
    resizeObserver.observe(tableWrap)
    window.addEventListener('resize', updateDocumentsPerPage)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateDocumentsPerPage)
    }
  }, [currentPage, hasDocuments, sortedDocuments.length])

  function changeDocumentSort(key: DocumentSortKey) {
    setDocumentSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  function downloadDocument(document: DocumentItem) {
    const blob = new Blob([document.content], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = `${document.title.replace(/\.txt$/i, '')}.txt`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  function handleDocumentsDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()

    if (canUpload) {
      onUploadFiles(event.dataTransfer.files)
    }
  }

  const documentsToolbar = (
    <DocumentsToolbar
      canUpload={canUpload}
      documentSearch={documentSearch}
      documentsCount={documents.length}
      hasDocuments={hasDocuments}
      onCreate={onCreate}
      onOpenFilePicker={onOpenFilePicker}
      onSearch={onSearch}
    />
  )

  return (
    <div className={`${styles.pageStack} ${styles.documentsPage}`}>
      <PageHeader
        title="Документы"
        text="Тут вы можете загрузить текстовые документы для анализа"
      />

      {!hasDocuments ? (
        <>
          {documentsToolbar}
          <section
            className={`${styles.card} ${styles.documentsListCard} ${styles.documentsEmptyCard}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDocumentsDrop}
          >
            <div className={styles.emptyListState}>
              <FolderOpen size={52} />
              <b>Документы ещё не загружены</b>
            </div>
          </section>
        </>
      ) : (
        <div className={styles.documentsLoadedGrid}>
          {documentsToolbar}
          <section
            className={`${styles.card} ${styles.documentsListCard}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDocumentsDrop}
          >
            <div
              className={styles.documentsTableWrap}
              ref={tableWrapRef}
              style={{ '--document-row-height': `${documentRowHeight}px` } as CSSProperties}
            >
              <table className={styles.documentsTable}>
                <colgroup>
                  <col className={styles.documentsColCheckbox} />
                  <col className={styles.documentsColDocument} />
                  <col className={styles.documentsColSymbols} />
                  <col className={styles.documentsColWords} />
                  <col className={styles.documentsColUpdatedAt} />
                  <col className={styles.documentsColActions} />
                </colgroup>
                <thead>
                  <tr>
                    <th>
                      <input
                        className={styles.checkboxInput}
                        checked={filteredDocuments.length > 0 && selectedDocumentIds.length === filteredDocuments.length}
                        type="checkbox"
                        onChange={(event) => onSelectAll(event.target.checked)}
                      />
                    </th>
                    <th>
                      <button className={styles.sortHeaderButton} type="button" onClick={() => changeDocumentSort('title')}>
                        <span>Название документа</span>
                        <SortIndicator direction={documentSort.key === 'title' ? documentSort.direction : null} />
                      </button>
                    </th>
                    <th>
                      <button className={styles.sortHeaderButton} type="button" onClick={() => changeDocumentSort('char_count')}>
                        <span>Символов</span>
                        <SortIndicator direction={documentSort.key === 'char_count' ? documentSort.direction : null} />
                      </button>
                    </th>
                    <th>
                      <button className={styles.sortHeaderButton} type="button" onClick={() => changeDocumentSort('raw_word_count')}>
                        <span>Слов</span>
                        <SortIndicator direction={documentSort.key === 'raw_word_count' ? documentSort.direction : null} />
                      </button>
                    </th>
                    <th>
                      <button className={styles.sortHeaderButton} type="button" onClick={() => changeDocumentSort('updated_at')}>
                        <span>Дата обновления</span>
                        <SortIndicator direction={documentSort.key === 'updated_at' ? documentSort.direction : null} />
                      </button>
                    </th>
                    <th aria-label="Действия" />
                  </tr>
                </thead>
                <tbody>
                  {visibleDocuments.map((document) => (
                    <tr key={document.id}>
                      <td>
                        <input
                          className={styles.checkboxInput}
                          checked={selectedDocumentIds.includes(document.id)}
                          type="checkbox"
                          onChange={() => onSelect(document.id)}
                        />
                      </td>
                      <td>
                        <div className={styles.documentNameCell}>
                          <span className={styles.documentIconBadge}>
                            <FileText size={22} />
                          </span>
                          <span>
                            <b title={document.title}>{document.title}</b>
                            <small title={document.content.slice(0, 90)}>{document.content.slice(0, 90)}</small>
                          </span>
                        </div>
                      </td>
                      <td>{formatNumber(document.char_count)}</td>
                      <td>{formatNumber(document.raw_word_count)}</td>
                      <td>{formatDate(document.updated_at ?? document.created_at)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button title="Редактировать" type="button" onClick={() => onEdit(document)}>
                            <Pencil size={17} />
                          </button>
                          <button title="Скачать" type="button" onClick={() => downloadDocument(document)}>
                            <Download size={17} />
                          </button>
                          <button title="Удалить" type="button" onClick={() => onDelete(document.id)}>
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.documentsFooter}>
              <div className={styles.massActions}>
                <span>Выбрано: {selectedDocumentIds.length}</span>
                <button
                  className={styles.secondaryButton}
                  disabled={selectedDocumentIds.length === 0 || isSaving}
                  aria-label="Удалить выбранное"
                  title="Удалить выбранное"
                  type="button"
                  onClick={onDeleteSelected}
                >
                  <Trash2 size={17} />
                  <span className={styles.massActionLabel}>Удалить выбранное</span>
                </button>
              </div>
              <DocumentsPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
              />
            </div>
          </section>

          <DocumentsSummary
            chars={corpusSummary.chars}
            documentsCount={documents.length}
            words={corpusSummary.words}
          />
        </div>
      )}
    </div>
  )
}

function SortIndicator({ direction }: { direction: SortDirection | null }) {
  return (
    <span className={styles.sortIconPair} aria-hidden="true">
      <i className={direction === 'asc' ? styles.sortIconActive : ''} />
      <i className={direction === 'desc' ? styles.sortIconActive : ''} />
    </span>
  )
}
