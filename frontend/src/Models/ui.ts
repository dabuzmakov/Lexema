export type TabId = 'seo' | 'compare' | 'spelling' | 'documents' | 'settings'
export type ModalMode = 'create' | 'edit'
export type WordSort = 'count_desc' | 'count_asc' | 'alpha'
export type SortDirection = 'asc' | 'desc'
export type DocumentSortKey = 'title' | 'char_count' | 'raw_word_count' | 'updated_at'

export interface DisplaySettings {
  topN: number
  minLength: number
  sort: WordSort
}

export interface DocumentModalState {
  mode: ModalMode
  documentId?: string
  title: string
  content: string
}
