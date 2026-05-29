import { createQuery, requestJson } from './http'
import type { AppStatePayload } from '../Models/api'

export async function getAppState(browserId: string) {
  return requestJson<AppStatePayload>(`/app/state${createQuery({ browser_id: browserId })}`)
}
