import { textFromList } from '../../../../Utils/lexema'
import type { AnalysisSettings } from '../../../../Models/settings'
import { SettingsTextareaField } from '../../../UI/SettingsTextareaField'

export function KeywordsSection({
  draft,
  onSetKeywords,
}: {
  draft: AnalysisSettings
  onSetKeywords: (value: string) => void
}) {
  return (
    <SettingsTextareaField
      maxLength={10000}
      placeholder="купить ноутбук, игровой ноутбук, seo оптимизация текста"
      subtitle="Введите ключевые слова через запятую"
      title="Ключевые слова и фразы"
      tooltip="Ключи используются для оценки покрытия семантики и приоритетных запросов в тексте"
      value={textFromList(draft.keywords)}
      onChange={onSetKeywords}
    />
  )
}
