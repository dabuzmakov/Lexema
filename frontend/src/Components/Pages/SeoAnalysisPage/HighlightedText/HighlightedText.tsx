import { useMemo } from 'react'
import styles from '../../../../App/Styles.module.scss'
import type { SeoResult } from '../../../../Models/analysis'
import type { AnalysisSettings } from '../../../../Models/settings'
import { buildHighlightSets, buildPartHighlights, normalizeTerm } from '../utils'
import type { HighlightKind } from '../types'

export function HighlightedText({
  enabled,
  result,
  settings,
  text,
}: {
  enabled: Record<HighlightKind, boolean>
  result: SeoResult
  settings: AnalysisSettings
  text: string
}) {
  const highlightSets = useMemo(() => buildHighlightSets(result, settings), [result, settings])
  const parts = useMemo(() => text.match(/\s+|[\p{L}]+(?:[-'][\p{L}]+)*|[^\s]/gu) ?? [], [text])
  const highlightByIndex = useMemo(() => buildPartHighlights(parts, highlightSets, enabled), [enabled, highlightSets, parts])

  return (
    <p>
      {parts.map((part, index) => {
        if (/^\s+$/.test(part)) {
          return part
        }

        const normalized = normalizeTerm(part)
        let className = ''
        const isMixed = enabled.mixed && (highlightSets.mixed.has(normalized) || hasMixedAlphabet(part))
        const highlightKind = highlightByIndex.get(index)

        if (highlightKind === 'keywords') {
          className = styles.highlightTagKeyword
        } else if (highlightKind === 'water') {
          className = styles.highlightTagWater
        } else if (highlightKind === 'stop') {
          className = styles.highlightTagStop
        }

        if (isMixed) {
          return (
            <span className={className} key={`${part}-${index}`}>
              {renderMixedWord(part)}
            </span>
          )
        }

        return className ? (
          <mark className={className} key={`${part}-${index}`}>
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      })}
    </p>
  )
}

export function renderMixedWord(word: string) {
  const chars = Array.from(word)
  const latinCount = chars.filter(isLatinLetter).length
  const cyrillicCount = chars.filter(isCyrillicLetter).length
  const shouldMarkLatin = cyrillicCount >= latinCount

  return chars.map((char, index) => {
    const isOffScript = shouldMarkLatin ? isLatinLetter(char) : isCyrillicLetter(char)

    return isOffScript ? (
      <span className={styles.highlightTagMixed} key={`${char}-${index}`}>
        {char}
      </span>
    ) : (
      <span key={`${char}-${index}`}>{char}</span>
    )
  })
}

function isLatinLetter(value: string) {
  return /[A-Za-z]/.test(value)
}

function isCyrillicLetter(value: string) {
  return /\p{Script=Cyrillic}/u.test(value)
}

function hasMixedAlphabet(value: string) {
  return Array.from(value).some(isLatinLetter) && Array.from(value).some(isCyrillicLetter)
}
