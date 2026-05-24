import type { CompareAnalysisResult, LastAnalysisResult, SeoResult, SpellingResult } from './analysis'
import type { DocumentItem } from './documents'
import type { AnalysisSettings } from './settings'

export interface ApiEnvelope<T> {
  status: 'success'
  data: T
  message?: string
}

export interface ApiErrorPayload {
  detail?: string | { code?: string; message?: string } | Array<{ msg?: string }>
  message?: string
  status?: string
}

export interface AppStatePayload {
  documents: DocumentItem[]
  settings: AnalysisSettings
  last_results: {
    seo: LastAnalysisResult<SeoResult> | null
    compare: LastAnalysisResult<CompareAnalysisResult> | null
    spelling: LastAnalysisResult<SpellingResult> | null
  }
}
