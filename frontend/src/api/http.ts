import type { ApiEnvelope, ApiErrorPayload } from '../Models/api'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')
).replace(/\/+$/, '')

type ApiErrorDetail = Exclude<ApiErrorPayload['detail'], string | Array<{ msg?: string }> | undefined>

const DEFAULT_LIMITS_BY_CODE: Record<string, number> = {
  TEXT_TOO_LARGE: 50_000,
  TOTAL_ANALYSIS_TEXT_TOO_LARGE: 1_500_000,
  TOTAL_SPELLING_TEXT_TOO_LARGE: 1_500_000,
  SPELLING_DOCUMENT_TOO_LARGE: 50_000,
  COMPARE_DOCUMENT_TOO_LARGE: 150_000,
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value)
}

function formatCharLimit(code: string, detail?: ApiErrorDetail) {
  const limit = typeof detail?.limit === 'number' ? detail.limit : DEFAULT_LIMITS_BY_CODE[code]
  return typeof limit === 'number' ? `${formatNumber(limit)} символов` : 'доступный лимит'
}

const apiErrorMessages: Record<string, (detail?: ApiErrorDetail) => string> = {
  DOCUMENT_LIMIT_REACHED: () => 'Лимит документов достигнут. Удалите лишний документ или замените один из текущих.',
  TEXT_TOO_LARGE: (detail) => `Документ слишком большой. Максимальный размер одного документа: ${formatCharLimit('TEXT_TOO_LARGE', detail)}.`,
  TOTAL_ANALYSIS_TEXT_TOO_LARGE: (detail) => `Суммарный объем выбранных документов для SEO-анализа превышает лимит: ${formatCharLimit('TOTAL_ANALYSIS_TEXT_TOO_LARGE', detail)}.`,
  TOTAL_SPELLING_TEXT_TOO_LARGE: (detail) => `Суммарный объем выбранных документов для проверки орфографии превышает лимит: ${formatCharLimit('TOTAL_SPELLING_TEXT_TOO_LARGE', detail)}.`,
  SPELLING_DOCUMENT_TOO_LARGE: (detail) => `Для проверки орфографии каждый документ должен быть не больше ${formatCharLimit('SPELLING_DOCUMENT_TOO_LARGE', detail)}.`,
  COMPARE_DOCUMENT_TOO_LARGE: (detail) => `Один из документов для сравнения слишком большой. Максимум для каждого документа: ${formatCharLimit('COMPARE_DOCUMENT_TOO_LARGE', detail)}.`,
  DOCUMENTS_NOT_FOUND: (detail) => detail?.missing_document_ids?.length
    ? `Не найдены выбранные документы: ${detail.missing_document_ids.join(', ')}.`
    : 'Выбранные документы не найдены. Обновите страницу и попробуйте снова.',
  DOCUMENT_IDS_REQUIRED: () => 'Выберите хотя бы один документ.',
  DOCUMENTS_MUST_BE_DIFFERENT: () => 'Для сравнения выберите два разных документа.',
  DOCUMENT_EMPTY: () => 'Один из выбранных документов пустой. Добавьте текст перед анализом.',
  DOCUMENT_NOT_FOUND: () => 'Документ не найден. Возможно, он уже был удален.',
  ANALYSIS_NOT_FOUND: () => 'Сначала выполните анализ, затем повторите экспорт.',
  SPELLING_ENGINE_UNAVAILABLE: () => 'Сервис проверки орфографии сейчас недоступен. Попробуйте позже.',
}

export function getFriendlyErrorMessage(message: string, detail?: ApiErrorDetail, status?: number) {
  const trimmed = message.trim()
  const mapped = apiErrorMessages[trimmed]

  if (mapped) {
    return mapped(detail)
  }

  if (trimmed === 'Database is not configured') {
    return 'Сервер временно не настроен для работы с базой данных.'
  }

  if (trimmed) {
    return trimmed
  }

  return `Ошибка запроса: ${status ?? 'неизвестная'}`
}

function getErrorMessage(payload: ApiErrorPayload | null, status: number) {
  if (!payload) {
    return `Ошибка запроса: ${status}`
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return getFriendlyErrorMessage(payload.message, undefined, status)
  }

  if (typeof payload.detail === 'string' && payload.detail.trim()) {
    return getFriendlyErrorMessage(payload.detail, undefined, status)
  }

  if (payload.detail && !Array.isArray(payload.detail) && typeof payload.detail === 'object') {
    const detail = payload.detail
    return getFriendlyErrorMessage(detail.message || detail.code || '', detail, status)
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
