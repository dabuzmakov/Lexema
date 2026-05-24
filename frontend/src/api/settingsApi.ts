import { createQuery, requestJson, USE_MOCK_API } from './http'
import type { AnalysisSettings } from '../Models/settings'

export async function getSettings(browserId: string) {
  if (USE_MOCK_API) {
    const { getMockSettings } = await import('./mockApi')
    return getMockSettings(browserId)
  }

  return requestJson<AnalysisSettings>(`/settings${createQuery({ browser_id: browserId })}`)
}

export async function saveSettings(browserId: string, settings: AnalysisSettings) {
  if (USE_MOCK_API) {
    const { saveMockSettings } = await import('./mockApi')
    return saveMockSettings(browserId, settings)
  }

  return requestJson<AnalysisSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify({
      browser_id: browserId,
      settings,
    }),
  })
}
