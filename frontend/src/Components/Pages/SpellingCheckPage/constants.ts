import type { SpellingCategory } from '../../../Models/analysis'

export const SPELLING_CATEGORY_META: Record<string, { label: string; color: string }> = {
  spelling: { label: 'Орфография', color: '#ef4444' },
  grammar: { label: 'Грамматика', color: '#f59e0b' },
  punctuation: { label: 'Пунктуация', color: '#2f80ed' },
  style: { label: 'Стилистика', color: '#8b5cf6' },
  typography: { label: 'Типографика', color: '#14b8a6' },
  other: { label: 'Другое', color: '#6b7280' },
}

export const SPELLING_CATEGORY_ORDER: SpellingCategory[] = [
  'spelling',
  'grammar',
  'punctuation',
  'style',
  'typography',
  'other',
]

export function normalizeSpellingCategory(category: SpellingCategory): keyof typeof SPELLING_CATEGORY_META {
  return category in SPELLING_CATEGORY_META ? category : 'other'
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
  return language || 'Не определён'
}
