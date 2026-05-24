import type { DisplaySettings, WordSort } from '../Models/ui'
import type { StopWordsMode } from '../Models/settings'

export const MAX_DOCUMENTS = 30
export const MIN_DOCUMENT_ROW_HEIGHT = 72
export const MAX_DOCUMENT_ROW_HEIGHT = 96
export const WORDS_PER_TEXT_PAGE = 250
export const BROWSER_ID_STORAGE_KEY = 'lexema_browser_id'
export const DISPLAY_SETTINGS_STORAGE_KEY = 'lexema_display_settings'

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  topN: 50,
  minLength: 3,
  sort: 'count_desc',
}

export const WORD_SORT_VALUES: WordSort[] = ['count_desc', 'count_asc', 'alpha']

export const stopWordsLabels: Record<StopWordsMode, string> = {
  off: 'Нет',
  default: 'Системные',
  custom: 'Свои',
  default_custom: 'Все',
}
