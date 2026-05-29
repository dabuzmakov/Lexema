import { AlertTriangle } from 'lucide-react'
import styles from '../../../../App/Styles.module.scss'
import type { SeoResult } from '../../../../Models/analysis'
import { CustomScrollArea } from '../CustomScrollArea'
import { EmptyPlaceholder } from '../EmptyPlaceholder'
import { renderMixedWord } from '../HighlightedText'
import { ResultSection } from '../ResultSection'

export function MixedAlphabetSection({
  result,
  rows,
}: {
  result: SeoResult
  rows: SeoResult['mixed_alphabet_words']
}) {
  if (result.mixed_alphabet_words.length === 0) {
    return (
      <ResultSection
        icon={<AlertTriangle size={18} />}
        wide
        title="Смешанная раскладка"
      >
        <div className={styles.textPreviewEmptySlot}>
          <EmptyPlaceholder fill text="Смешанная раскладка не обнаружена" />
        </div>
      </ResultSection>
    )
  }

  return (
    <ResultSection
      icon={<AlertTriangle size={18} />}
      wide
      title="Смешанная раскладка"
    >
      <div className={styles.mixedAlphabetDesktop}>
        <CustomScrollArea className={styles.mixedCompactScroll}>
          <div className={styles.mixedCompactList}>
            <div className={styles.mixedCompactHeader}>
              <span>Фрагмент</span>
              <span>Проблема</span>
              <span>Вхождений</span>
            </div>
            {rows.map((item) => (
              <div className={styles.mixedCompactRow} key={item.word}>
                <div className={styles.mixedFragmentCell} title={item.word}>
                  <span className={styles.mixedFragmentText}>{renderMixedWord(item.word)}</span>
                </div>
                <div className={styles.mixedSuggestionCell}>
                  <span>Замена:</span>
                  <b title={item.suggestion}>{item.suggestion}</b>
                </div>
                <span className={styles.mixedCountBadge} aria-label={`${item.count} вхождений`}>
                  <span className={styles.mixedCountFull}>{item.count} вх.</span>
                  <span className={styles.mixedCountShort}>{item.count}</span>
                </span>
              </div>
            ))}
          </div>
        </CustomScrollArea>
      </div>

      <div className={styles.mixedAlphabetMobileList}>
        {rows.map((item) => (
          <div className={styles.mixedAlphabetMobileCell} key={item.word}>
            <span className={styles.mixedAlphabetMobileWord} title={item.word}>
              {renderMixedWord(item.word)}
            </span>
            <span className={styles.mixedAlphabetMobileCount} aria-label={`${item.count} вхождений`}>
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </ResultSection>
  )
}
