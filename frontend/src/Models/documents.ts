export interface DocumentItem {
  id: string
  client_document_id: string
  database_id?: number
  title: string
  content: string
  char_count: number
  raw_word_count: number
  created_at?: string | null
  updated_at?: string | null
}

export interface DocumentPayload {
  title: string
  content: string
  client_document_id?: string
}

export interface DocumentUpdatePayload {
  title?: string
  content?: string
}
