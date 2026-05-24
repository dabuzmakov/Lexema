export type StopWordsMode = 'off' | 'default' | 'custom' | 'default_custom'

export interface AnalysisSettings {
  stop_words: {
    mode: StopWordsMode
    custom: string[]
  }
  keywords: string[]
  lemmatization: boolean
  ngrams: {
    sizes: number[]
  }
  spam: {
    threshold_percent: number
  }
}

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  stop_words: {
    mode: 'default',
    custom: [],
  },
  keywords: [],
  lemmatization: true,
  ngrams: {
    sizes: [2, 3],
  },
  spam: {
    threshold_percent: 3,
  },
}
