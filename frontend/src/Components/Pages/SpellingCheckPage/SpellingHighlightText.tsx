import type { SpellingIssue } from '../../../Models/analysis'
import { normalizeSpellingCategory } from './constants'
import styles from './Styles.module.scss'

function getSafeIssues(text: string, issues: SpellingIssue[]) {
  const sorted = issues
    .map((issue) => ({
      ...issue,
      end: issue.offset + issue.length,
    }))
    .filter((issue) =>
      Number.isFinite(issue.offset)
      && Number.isFinite(issue.length)
      && issue.offset >= 0
      && issue.length > 0
      && issue.end <= text.length,
    )
    .sort((left, right) => left.offset - right.offset || left.length - right.length)

  const result: typeof sorted = []
  let cursor = 0

  sorted.forEach((issue) => {
    if (issue.offset < cursor) {
      return
    }
    result.push(issue)
    cursor = issue.end
  })

  return result
}

export function SpellingHighlightText({
  issues,
  showHighlights,
  text,
}: {
  issues: SpellingIssue[]
  showHighlights: boolean
  text: string
}) {
  if (!showHighlights || issues.length === 0) {
    return <p>{text}</p>
  }

  const ranges = getSafeIssues(text, issues)
  const chunks: Array<{ key: string; text: string; issue?: SpellingIssue }> = []
  let cursor = 0

  ranges.forEach((issue, index) => {
    if (issue.offset > cursor) {
      chunks.push({
        key: `text-${index}-${cursor}`,
        text: text.slice(cursor, issue.offset),
      })
    }

    chunks.push({
      key: issue.id || `issue-${index}`,
      text: text.slice(issue.offset, issue.end),
      issue,
    })
    cursor = issue.end
  })

  if (cursor < text.length) {
    chunks.push({ key: `text-tail-${cursor}`, text: text.slice(cursor) })
  }

  return (
    <p>
      {chunks.map((chunk) => {
        if (!chunk.issue) {
          return <span key={chunk.key}>{chunk.text}</span>
        }

        const category = normalizeSpellingCategory(chunk.issue.category)
        return (
          <mark
            className={`${styles.highlight} ${styles[`highlight_${category}`]}`}
            key={chunk.key}
            title={chunk.issue.message || chunk.issue.short_message}
          >
            {chunk.text}
          </mark>
        )
      })}
    </p>
  )
}
