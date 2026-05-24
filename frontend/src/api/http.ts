import type { ApiEnvelope, ApiErrorPayload } from '../Models/api'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')
).replace(/\/+$/, '')

export const USE_MOCK_API = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true'

function getErrorMessage(payload: ApiErrorPayload | null, status: number) {
  if (!payload) {
    return `Ошибка запроса: ${status}`
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message
  }

  if (typeof payload.detail === 'string' && payload.detail.trim()) {
    return payload.detail
  }

  if (payload.detail && !Array.isArray(payload.detail) && typeof payload.detail === 'object') {
    return payload.detail.message || payload.detail.code || `Ошибка запроса: ${status}`
  }

  if (Array.isArray(payload.detail)) {
    const message = payload.detail
      .map((item) => item.msg)
      .filter(Boolean)
      .join('; ')

    if (message) {
      return message
    }
  }

  return `Ошибка запроса: ${status}`
}

export function createQuery(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value))
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  let payload: ApiEnvelope<T> | ApiErrorPayload | null = null

  try {
    payload = (await response.json()) as ApiEnvelope<T> | ApiErrorPayload
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload as ApiErrorPayload | null, response.status))
  }

  if (!payload || (payload as ApiEnvelope<T>).status !== 'success') {
    throw new Error(getErrorMessage(payload as ApiErrorPayload | null, response.status))
  }

  return (payload as ApiEnvelope<T>).data
}

export async function requestBlob(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null

    try {
      payload = (await response.json()) as ApiErrorPayload
    } catch {
      payload = null
    }

    throw new Error(getErrorMessage(payload, response.status))
  }

  return response
}

export function downloadResponseBlob(response: Response, fallbackName: string) {
  return response.blob().then((blob) => {
    const disposition = response.headers.get('content-disposition')
    const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)
    const fileName = match?.[1]
      ? decodeURIComponent(match[1].replace(/"/g, ''))
      : fallbackName

    downloadBlob(blob, fileName)
  })
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0)
}
