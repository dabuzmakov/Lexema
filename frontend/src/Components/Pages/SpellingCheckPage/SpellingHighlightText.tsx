import { useMemo } from 'react'
import type { SpellingIssue } from '../../../Models/analysis'
import { normalizeSpellingCategory } from './constants'
import styles from './Styles.module.scss'

type HighlightIssue = SpellingIssue & { end: number }

const severityWeight: Record<string, number> = {
  error: 30,
  warning: 20,
  info: 10,
}

const categoryWeight: Record<string, number> = {
  spelling: 30,
  grammar: 20,
  punctuation: 20,
  style: 10,
  typography: 10,
}

function getIssueWeight(issue: SpellingIssue) {
  return Math.max(
    severityWeight[issue.severity] ?? 0,
    categoryWeight[normalizeSpellingCategory(issue.category)] ?? 0,
  )
}

function choosePrimaryIssue(issues: HighlightIssue[]) {
  return issues.reduce((best, issue) => {
    const weightDiff = getIssueWeight(issue) - getIssueWeight(best)
    if (weightDiff > 0) {
      return issue
    }
    if (weightDiff < 0) {
      return best
    }

    const issueLength = issue.end - issue.offset
    const bestLength = best.end - best.offset
    if (issueLength > bestLength) {
      return issue
    }
    if (issueLength < bestLength) {
      return best
    }

    return issue.offset < best.offset ? issue : best
  })
}

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

  const result: HighlightIssue[] = []
  let overlapping: HighlightIssue[] = []
  let overlappingEnd = 0

  sorted.forEach((issue) => {
    if (overlapping.length === 0) {
      overlapping = [issue]
      overlappingEnd = issue.end
      return
    }

    if (issue.offset < overlappingEnd) {
      overlapping.push(issue)
      overlappingEnd = Math.max(overlappingEnd, issue.end)
      return
    }

    result.push(choosePrimaryIssue(overlapping))
    overlapping = [issue]
    overlappingEnd = issue.end
  })

  if (overlapping.length > 0) {
    result.push(choosePrimaryIssue(overlapping))
  }

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
  const chunks = useMemo(() => {
    if (!showHighlights || issues.length === 0) {
      return [{ key: 'text-full', text }]
    }

    const ranges = getSafeIssues(text, issues)
    const nextChunks: Array<{ key: string; text: string; issue?: SpellingIssue }> = []
    let cursor = 0

    ranges.forEach((issue, index) => {
      if (issue.offset > cursor) {
        nextChunks.push({
          key: `text-${index}-${cursor}`,
          text: text.slice(cursor, issue.offset),
        })
      }

      nextChunks.push({
        key: issue.id || `issue-${index}`,
        text: text.slice(issue.offset, issue.end),
        issue,
      })
      cursor = issue.end
    })

    if (cursor < text.length) {
      nextChunks.push({ key: `text-tail-${cursor}`, text: text.slice(cursor) })
    }

    return nextChunks
  }, [issues, showHighlights, text])

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
