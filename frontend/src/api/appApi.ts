import { createQuery, requestJson, USE_MOCK_API } from './http'
import type { AppStatePayload } from '../Models/api'

export async function getAppState(browserId: string) {
  if (USE_MOCK_API) {
    const { getMockAppState } = await import('./mockApi')
    return getMockAppState(browserId)
  }

  return requestJson<AppStatePayload>(`/app/state${createQuery({ browser_id: browserId })}`)
}
