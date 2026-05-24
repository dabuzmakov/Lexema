import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { SpellingIssue } from '../../../Models/analysis'
import { CustomScrollArea } from '../SeoAnalysisPage/CustomScrollArea'
import { getSpellingCategoryLabel, normalizeSpellingCategory } from './constants'
import styles from './Styles.module.scss'

export function SpellingIssuesList({ issues }: { issues: SpellingIssue[] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>
            <AlertCircle size={18} />
            Найденные ошибки
          </h2>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className={styles.issuesEmptyState}>
          <CheckCircle2 size={22} />
          <b>Ошибки не найдены</b>
        </div>
      ) : (
        <CustomScrollArea className={styles.issuesScroll}>
          <div className={styles.issueCards}>
            {issues.map((issue) => {
              const category = normalizeSpellingCategory(issue.category)
              const replacement = issue.replacements[0] || 'Нет варианта'
              const message = issue.short_message || issue.message || issue.rule_id

              return (
                <article className={styles.issueCard} key={issue.id}>
                  <div className={styles.issueCardHeader}>
                    <span className={styles.issueType}>
                      <i className={styles[`dot_${category}`]} />
                      {getSpellingCategoryLabel(category)}
                    </span>
                    <small>Поз. {issue.offset + 1}</small>
                  </div>

                  <div className={styles.issueCorrection}>
                    <b title={issue.word}>{issue.word || 'Фрагмент'}</b>
                    <ArrowRight size={14} />
                    <strong title={replacement}>{replacement}</strong>
                  </div>

                  <p title={issue.message || message}>{message}</p>
                </article>
              )
            })}
          </div>
        </CustomScrollArea>
      )}
    </section>
  )
}
