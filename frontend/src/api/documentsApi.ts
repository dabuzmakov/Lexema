import { createQuery, requestJson, USE_MOCK_API } from './http'
import type { DocumentItem, DocumentPayload, DocumentUpdatePayload } from '../Models/documents'

export async function getDocuments(browserId: string) {
  if (USE_MOCK_API) {
    const { getMockDocuments } = await import('./mockApi')
    return getMockDocuments(browserId)
  }

  return requestJson<DocumentItem[]>(`/documents${createQuery({ browser_id: browserId })}`)
}

export async function createDocument(browserId: string, document: DocumentPayload) {
  if (USE_MOCK_API) {
    const { createMockDocumentApi } = await import('./mockApi')
    return createMockDocumentApi(browserId, document)
  }

  return requestJson<DocumentItem>('/documents', {
    method: 'POST',
    body: JSON.stringify({
      browser_id: browserId,
      ...document,
    }),
  })
}

export async function updateDocument(
  browserId: string,
  documentId: string,
  payload: DocumentUpdatePayload,
) {
  if (USE_MOCK_API) {
    const { updateMockDocumentApi } = await import('./mockApi')
    return updateMockDocumentApi(browserId, documentId, payload)
  }

  return requestJson<DocumentItem>(`/documents/${encodeURIComponent(documentId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      browser_id: browserId,
      ...payload,
    }),
  })
}

export async function deleteDocument(browserId: string, documentId: string) {
  if (USE_MOCK_API) {
    const { deleteMockDocumentApi } = await import('./mockApi')
    return deleteMockDocumentApi(browserId, documentId)
  }

  return requestJson<{ message?: string }>(
    `/documents/${encodeURIComponent(documentId)}${createQuery({ browser_id: browserId })}`,
    { method: 'DELETE' },
  )
}
