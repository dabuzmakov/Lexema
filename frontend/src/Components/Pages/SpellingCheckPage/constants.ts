import type { SpellingCategory } from '../../../Models/analysis'

export const SPELLING_CATEGORY_META = {
  spelling: { label: 'Орфография', color: '#ef4444' },
  grammar: { label: 'Грамматика', color: '#f59e0b' },
  punctuation: { label: 'Пунктуация', color: '#2f80ed' },
  style: { label: 'Стилистика', color: '#8b5cf6' },
  typography: { label: 'Типографика', color: '#14b8a6' },
} satisfies Record<string, { label: string; color: string }>

export type KnownSpellingCategory = keyof typeof SPELLING_CATEGORY_META

export const SPELLING_CATEGORY_ORDER: KnownSpellingCategory[] = [
  'spelling',
  'grammar',
  'punctuation',
  'style',
  'typography',
]

export function isKnownSpellingCategory(category: SpellingCategory): category is KnownSpellingCategory {
  return category in SPELLING_CATEGORY_META
}

export function normalizeSpellingCategory(category: SpellingCategory): KnownSpellingCategory {
  return isKnownSpellingCategory(category) ? category : 'style'
}

export function getSpellingCategoryLabel(category: SpellingCategory) {
  return SPELLING_CATEGORY_META[normalizeSpellingCategory(category)].label
}

export function getLanguageLabel(language: string) {
  if (language === 'ru-RU') {
    return 'Русский'
  }
  if (language === 'en-US') {
    return 'Английский'
  }
  if (language === 'mixed') {
    return 'Смешанный'
  }
  return language || 'Не определен'
}
