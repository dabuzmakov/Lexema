import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from '../../../../App/Styles.module.scss'

export function DocumentsPagination({
  currentPage,
  onNext,
  onPrevious,
  totalPages,
}: {
  currentPage: number
  onNext: () => void
  onPrevious: () => void
  totalPages: number
}) {
  return (
    <div className={styles.paginationControls}>
      <button
        aria-label="Предыдущая страница"
        disabled={currentPage <= 1}
        type="button"
        onClick={onPrevious}
      >
        <ChevronLeft size={17} />
      </button>
      <span>{currentPage}</span>
      <button
        aria-label="Следующая страница"
        disabled={currentPage >= totalPages}
        type="button"
        onClick={onNext}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  )
}
