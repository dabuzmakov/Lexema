import { createQuery, requestJson } from './http'
import type { AnalysisSettings } from '../Models/settings'

export async function getSettings(browserId: string) {
  return requestJson<AnalysisSettings>(`/settings${createQuery({ browser_id: browserId })}`)
}

export async function saveSettings(browserId: string, settings: AnalysisSettings) {
  return requestJson<AnalysisSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify({
      browser_id: browserId,
      settings,
    }),
  })
}
