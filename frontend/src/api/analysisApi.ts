import { requestJson, USE_MOCK_API } from './http'
import type { LastAnalysisResult, SeoResult, SpellingResult } from '../Models/analysis'
import type { AnalysisSettings } from '../Models/settings'

export async function runSeoAnalysis(
  browserId: string,
  documentIds: string[],
  params: AnalysisSettings,
) {
  if (USE_MOCK_API) {
    const { runMockSeoAnalysis } = await import('./mockApi')
    return runMockSeoAnalysis(browserId, documentIds, params)
  }

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
  if (USE_MOCK_API) {
    const { runMockSpellingAnalysis } = await import('./mockApi')
    return runMockSpellingAnalysis(browserId, documentIds)
  }

  return requestJson<LastAnalysisResult<SpellingResult>>('/analysis/spelling', {
    method: 'POST',
    body: JSON.stringify({
      browser_id: browserId,
      document_ids: documentIds,
    }),
  })
}
