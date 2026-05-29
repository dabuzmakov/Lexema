import { createQuery, downloadResponseBlob, requestBlob } from './http'
import type { CompareTableExportType, SeoTableExportType } from '../Models/analysis'

const csvNames: Record<SeoTableExportType, string> = {
  words: 'seo_words.csv',
  ngrams: 'seo_ngrams.csv',
  keywords: 'seo_keywords.csv',
  spam: 'seo_spam.csv',
  water: 'seo_water.csv',
  mixed: 'seo_mixed.csv',
}

const compareCsvNames: Record<CompareTableExportType, string> = {
  words: 'compare_words.csv',
  ngrams: 'compare_ngrams.csv',
  keywords: 'compare_keywords.csv',
}

export async function downloadSeoCsv(type: SeoTableExportType, browserId: string) {
  const response = await requestBlob(
    `/export/csv/seo/${type}${createQuery({ browser_id: browserId })}`,
  )
  await downloadResponseBlob(response, csvNames[type])
}

export async function downloadCompareCsv(type: CompareTableExportType, browserId: string) {
  const response = await requestBlob(
    `/export/csv/compare/${type}${createQuery({ browser_id: browserId })}`,
  )
  await downloadResponseBlob(response, compareCsvNames[type])
}

export async function downloadSeoZip(browserId: string) {
  const response = await requestBlob(`/export/zip/seo${createQuery({ browser_id: browserId })}`)
  await downloadResponseBlob(response, 'seo_report.zip')
}
