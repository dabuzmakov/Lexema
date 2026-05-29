import { createQuery, requestJson } from './http'
import type { DocumentItem, DocumentPayload, DocumentUpdatePayload } from '../Models/documents'

export async function getDocuments(browserId: string) {
  return requestJson<DocumentItem[]>(`/documents${createQuery({ browser_id: browserId })}`)
}

export async function createDocument(browserId: string, document: DocumentPayload) {
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
  return requestJson<DocumentItem>(`/documents/${encodeURIComponent(documentId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      browser_id: browserId,
      ...payload,
    }),
  })
}

export async function deleteDocument(browserId: string, documentId: string) {
  return requestJson<{ message?: string }>(
    `/documents/${encodeURIComponent(documentId)}${createQuery({ browser_id: browserId })}`,
    { method: 'DELETE' },
  )
}
