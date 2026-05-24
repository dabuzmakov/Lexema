import { requestJson, USE_MOCK_API } from './http'
import type { CompareAnalysisResult, LastAnalysisResult } from '../Models/analysis'

export async function runCompareAnalysis(
  browserId: string,
  documentAId: string,
  documentBId: string,
) {
  if (USE_MOCK_API) {
    const { runMockCompareAnalysis } = await import('./mockApi')
    return runMockCompareAnalysis(browserId, documentAId, documentBId)
  }

  return requestJson<LastAnalysisResult<CompareAnalysisResult>>('/analysis/compare', {
    method: 'POST',
    body: JSON.stringify({
      browser_id: browserId,
      document_a_id: documentAId,
      document_b_id: documentBId,
    }),
  })
}
