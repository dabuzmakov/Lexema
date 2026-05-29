import { requestJson } from './http'
import type { LastAnalysisResult, SeoResult, SpellingResult } from '../Models/analysis'
import type { AnalysisSettings } from '../Models/settings'

export async function runSeoAnalysis(
  browserId: string,
  documentIds: string[],
  params: AnalysisSettings,
) {
  return requestJson<LastAnalysisResult<SeoResult>>('/analysis/seo', {
    method: 'POST',
    body: JSON.stringify({
      browser_id: browserId,
      document_ids: documentIds,
      params,
    }),
  })
}

export async function runSpellingAnalysis(browserId: string, documentIds: string[]) {
  return requestJson<LastAnalysisResult<SpellingResult>>('/analysis/spelling', {
    method: 'POST',
    body: JSON.stringify({
      browser_id: browserId,
      document_ids: documentIds,
    }),
  })
}
