export type KeywordStatus = 'missing' | 'low' | 'normal' | 'high' | 'spam' | string

export interface SeoWordRow {
  word: string
  count: number
  density: number
  length: number
  is_keyword: boolean
}

export interface SeoNgramRow {
  phrase: string
  size: number
  count: number
  density: number
  is_keyword: boolean
}

export interface SeoKeywordRow {
  keyword: string
  type: 'word' | 'ngram'
  count: number
  density: number
  status: KeywordStatus
}

export interface SeoSpamWarning {
  item: string
  type: 'word' | 'ngram' | string
  count: number
  density: number
  threshold: number
  status: string
}

export interface SeoWaterMarker {
  marker: string
  count: number
}

export interface SeoWater {
  percent: number
  level: 'low' | 'medium' | 'high' | string
  water_units_count: number
  total_words: number
  markers?: SeoWaterMarker[]
  top_markers: SeoWaterMarker[]
}

export interface SeoMixedAlphabetWord {
  word: string
  count: number
  suggestion: string
}

export interface SeoStructureParagraph {
  index: number
  words_count: number
  sentences_count: number
  percent_of_text: number
  preview: string
}

export interface SeoStructure {
  paragraphs_count: number
  sentences_count: number
  words_count: number
  avg_words_per_paragraph: number
  avg_words_per_sentence: number
  paragraphs: SeoStructureParagraph[]
}

export interface SeoSummary {
  documents_count: number
  total_words: number
  unique_words: number
  keywords_total: number
  keywords_found: number
  keywords_missing: number
  spam_warnings_count: number
  water_percent: number
  mixed_alphabet_count: number
  spam_level: string
  keyword_coverage_percent: number
}

export interface SeoResult {
  summary: SeoSummary
  words: SeoWordRow[]
  ngrams: SeoNgramRow[]
  keywords: SeoKeywordRow[]
  spam_warnings: SeoSpamWarning[]
  water: SeoWater
  mixed_alphabet_words: SeoMixedAlphabetWord[]
  structure?: SeoStructure
  recommendations: string[]
  lexicon?: {
    stop_words: string[]
    water_markers: string[]
  }
  charts?: {
    top_words?: Array<{ label: string; value: number }>
    top_ngrams?: Array<{ label: string; value: number }>
    keyword_coverage?: { found: number; total: number }
    water?: { percent: number; level: string }
    spam?: { count: number; level: string }
    structure?: {
      paragraph_share?: Array<{ label: string; value: number }>
      paragraph_words?: Array<{ label: string; value: number }>
      sentence_words?: Array<{ label: string; value: number }>
    }
  }
}

export interface LastAnalysisResult<T> {
  analysis_type: string
  selected_document_ids: string[]
  params_snapshot: unknown
  result: T
  is_actual: boolean
  invalidation_reason?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type SeoTableExportType = 'words' | 'ngrams' | 'keywords' | 'spam' | 'water' | 'mixed'
export type CompareTableExportType = 'words' | 'ngrams' | 'keywords'

export interface CompareDocumentInfo {
  document_id: string
  title: string
  char_count: number
  word_count: number
}

export interface CompareMetricDiff {
  a: number | string | null
  b: number | string | null
  diff: number | string | null
  diff_percent?: number | null
}

export interface CompareKeywordSide {
  found: boolean
  count: number
  density: number
}

export type CompareKeywordStatus =
  | 'same'
  | 'missing_in_a'
  | 'missing_in_b'
  | 'higher_in_a'
  | 'higher_in_b'
  | 'lower_in_a'
  | 'lower_in_b'
  | string

export interface CompareKeywordItem {
  keyword: string
  a: CompareKeywordSide
  b: CompareKeywordSide
  diff_count: number
  diff_density: number
  status: CompareKeywordStatus
}

export interface CompareWordCommonItem {
  word: string
  a_count: number
  b_count: number
  a_density?: number
  b_density?: number
  diff_count: number
  diff_density?: number
}

export interface CompareWordUniqueItem {
  word: string
  count: number
  density?: number
}

export interface CompareNgramCommonItem {
  phrase: string
  n?: number
  size?: number
  a_count: number
  b_count: number
  a_density?: number
  b_density?: number
  diff_count: number
  diff_density?: number
}

export interface CompareNgramUniqueItem {
  phrase: string
  n?: number
  size?: number
  count: number
  density?: number
}

export interface CompareWordsComparison {
  common: CompareWordCommonItem[]
  only_a: CompareWordUniqueItem[]
  only_b: CompareWordUniqueItem[]
}

export interface CompareNgramsComparison {
  common: CompareNgramCommonItem[]
  only_a: CompareNgramUniqueItem[]
  only_b: CompareNgramUniqueItem[]
}

export interface CompareSimilarity {
  vocabulary_overlap_percent?: number | null
  ngram_overlap_percent?: number | null
  cosine_similarity_percent?: number | null
}

export interface CompareWaterSide {
  percent?: number | null
  words_count?: number | null
  status?: string | null
}

export interface CompareWaterComparison {
  a?: CompareWaterSide
  b?: CompareWaterSide
  diff_percent?: number | null
  words_count?: CompareMetricDiff
}

export interface CompareSpamSide {
  risk?: string | null
  warnings_count?: number | null
  warnings?: SeoSpamWarning[]
}

export interface CompareSpamComparison {
  a?: CompareSpamSide
  b?: CompareSpamSide
  diff_warnings?: number | null
}

export interface CompareStructureComparison {
  paragraphs_count?: CompareMetricDiff
  sentences_count?: CompareMetricDiff
  avg_paragraph_length?: CompareMetricDiff
  avg_sentence_length?: CompareMetricDiff
}

export type CompareInsightType = 'info' | 'warning' | 'success' | 'error' | string

export interface CompareInsight {
  type: CompareInsightType
  code?: string
  message: string
}

export interface CompareSummary {
  word_count_diff?: number | null
  word_count_diff_percent?: number | null
  unique_words_diff?: number | null
  water_diff?: number | null
  keyword_coverage_a?: number | null
  keyword_coverage_b?: number | null
  vocabulary_overlap_percent?: number | null
  ngram_overlap_percent?: number | null
  cosine_similarity_percent?: number | null
}

export interface CompareAnalysisResult {
  documents: {
    a: CompareDocumentInfo
    b: CompareDocumentInfo
  }
  summary: CompareSummary
  metrics: Record<string, CompareMetricDiff | undefined>
  keywords_comparison: CompareKeywordItem[]
  words_comparison: CompareWordsComparison
  ngrams_comparison: CompareNgramsComparison
  water_comparison?: CompareWaterComparison | null
  spam_comparison?: CompareSpamComparison | null
  structure_comparison?: CompareStructureComparison | null
  similarity?: CompareSimilarity | null
  insights?: CompareInsight[]
}

export type SpellingCategory =
  | 'spelling'
  | 'grammar'
  | 'punctuation'
  | 'style'
  | 'typography'
  | string

export type SpellingSeverity = 'error' | 'warning' | 'info' | string

export interface SpellingIssue {
  id: string
  rule_id: string
  message: string
  short_message: string
  category: SpellingCategory
  category_name: string
  severity: SpellingSeverity
  offset: number
  length: number
  context: string
  context_offset: number
  word: string
  replacements: string[]
  sentence: string
  language: string
}

export interface SpellingDocumentResult {
  document_id: string
  title: string
  language: string
  languages?: string[]
  text_length: number
  checked_char_count: number
  truncated: boolean
  issues_count: number
  issues: SpellingIssue[]
}

export interface SpellingSummary {
  documents_count: number
  total_issues: number
  spelling_count: number
  grammar_count: number
  punctuation_count?: number
  style_count: number
  typography_count: number
  languages: string[]
  checked_at: string
  engine?: string
  max_check_time_millis?: number
}

export interface SpellingResult {
  summary: SpellingSummary
  documents: SpellingDocumentResult[]
}
