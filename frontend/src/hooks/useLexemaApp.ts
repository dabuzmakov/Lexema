import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { getAppState } from '../Api/appApi'
import { runSeoAnalysis, runSpellingAnalysis } from '../Api/analysisApi'
import { runCompareAnalysis } from '../Api/compareApi'
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from '../Api/documentsApi'
import { downloadCompareCsv, downloadSeoCsv, downloadSeoZip } from '../Api/exportApi'
import { saveSettings } from '../Api/settingsApi'
import {
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_SETTINGS_STORAGE_KEY,
  MAX_DOCUMENTS,
} from '../Utils/lexemaConstants'
import {
  createMarkdownTable,
  getOrCreateBrowserId,
  getStoredDisplaySettings,
  markSeoStale,
  normalizeAnalysisSettings,
  normalizeDisplaySettings,
  readTextFile,
  sanitizeDocumentTitle,
} from '../Utils/lexema'
import type {
  LastAnalysisResult,
  CompareAnalysisResult,
  CompareTableExportType,
  SeoKeywordRow,
  SeoNgramRow,
  SeoResult,
  SeoTableExportType,
  SeoWordRow,
  SpellingResult,
} from '../Models/analysis'
import type { DocumentItem } from '../Models/documents'
import {
  DEFAULT_ANALYSIS_SETTINGS,
  type AnalysisSettings,
  type StopWordsMode,
} from '../Models/settings'
import type { DisplaySettings, DocumentModalState, TabId, WordSort } from '../Models/ui'

type AppMessage = {
  text: string
  variant?: 'copy' | 'info'
}

type UploadContext = 'seo' | 'compare' | 'spelling'

export function useLexemaApp() {
  const [browserId] = useState(getOrCreateBrowserId)
  const [activeTab, setActiveTab] = useState<TabId>('seo')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [settings, setSettings] = useState<AnalysisSettings>(DEFAULT_ANALYSIS_SETTINGS)
  const [settingsDraft, setSettingsDraft] =
    useState<AnalysisSettings>(DEFAULT_ANALYSIS_SETTINGS)
  const [seoResult, setSeoResult] = useState<LastAnalysisResult<SeoResult> | null>(null)
  const [compareResult, setCompareResult] = useState<LastAnalysisResult<CompareAnalysisResult> | null>(null)
  const [spellingResult, setSpellingResult] = useState<LastAnalysisResult<SpellingResult> | null>(null)
  const [selectedSeoDocumentIds, setSelectedSeoDocumentIds] = useState<string[]>([])
  const [compareDocumentAId, setCompareDocumentAId] = useState<string | null>(null)
  const [compareDocumentBId, setCompareDocumentBId] = useState<string | null>(null)
  const [selectedSpellingDocumentIds, setSelectedSpellingDocumentIds] = useState<string[]>([])
  const [currentSpellingDocumentId, setCurrentSpellingDocumentId] = useState<string | null>(null)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [documentSearch, setDocumentSearch] = useState('')
  const [modal, setModal] = useState<DocumentModalState | null>(null)
  const [isAppLoading, setIsAppLoading] = useState(true)
  const [isDocumentSaving, setIsDocumentSaving] = useState(false)
  const [isSettingsSaving, setIsSettingsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCompareAnalyzing, setIsCompareAnalyzing] = useState(false)
  const [isSpellingAnalyzing, setIsSpellingAnalyzing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [spellingErrorMessage, setSpellingErrorMessage] = useState<string | null>(null)
  const [compareErrorMessage, setCompareErrorMessage] = useState<string | null>(null)
  const [message, setMessage] = useState<AppMessage | null>(null)
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(getStoredDisplaySettings)
  const [displaySettingsDraft, setDisplaySettingsDraft] =
    useState<DisplaySettings>(getStoredDisplaySettings)
  const [wordTopN, setWordTopN] = useState(displaySettings.topN)
  const [wordMinLength, setWordMinLength] = useState(displaySettings.minLength)
  const [wordSort, setWordSort] = useState<WordSort>(displaySettings.sort)
  const [ngramSizes, setNgramSizes] = useState<number[]>([2, 3])
  const [ngramTopN, setNgramTopN] = useState(20)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let isMounted = true

    getAppState(browserId)
      .then((state) => {
        if (!isMounted) {
          return
        }

        setDocuments(state.documents)
        const normalizedSettings = normalizeAnalysisSettings(state.settings, { migrateDefaultThreshold: true })
        setSettings(normalizedSettings)
        setSettingsDraft(normalizedSettings)
        setSeoResult(state.last_results.seo)
        setCompareResult(state.last_results.compare)
        setSpellingResult(state.last_results.spelling)

        const restoredSelection = state.last_results.seo?.selected_document_ids ?? []
        setSelectedSeoDocumentIds(
          restoredSelection.length > 0
            ? restoredSelection
            : state.documents.map((document) => document.id),
        )

        const restoredCompareSelection = state.last_results.compare?.selected_document_ids ?? []
        const initialCompareAId = restoredCompareSelection[0] ?? state.documents[0]?.id ?? null
        const initialCompareBId = restoredCompareSelection[1]
          ?? state.documents.find((document) => document.id !== initialCompareAId)?.id
          ?? null
        setCompareDocumentAId(initialCompareAId)
        setCompareDocumentBId(initialCompareBId)

        const restoredSpellingSelection = state.last_results.spelling?.selected_document_ids ?? []
        const nextSpellingSelection = restoredSpellingSelection.length > 0
          ? restoredSpellingSelection
          : state.documents.slice(0, 1).map((document) => document.id)
        setSelectedSpellingDocumentIds(nextSpellingSelection)
        setCurrentSpellingDocumentId(nextSpellingSelection[0] ?? null)
      })
      .catch((error: Error) => showMessage(error.message))
      .finally(() => {
        if (isMounted) {
          setIsAppLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [browserId])

  const filteredDocuments = useMemo(() => {
    const query = documentSearch.trim().toLowerCase()

    if (!query) {
      return documents
    }

    return documents.filter((document) =>
      `${document.title} ${document.content}`.toLowerCase().includes(query),
    )
  }, [documentSearch, documents])

  const selectedSeoDocuments = useMemo(
    () => documents.filter((document) => selectedSeoDocumentIds.includes(document.id)),
    [documents, selectedSeoDocumentIds],
  )

  const selectedSpellingDocuments = useMemo(
    () => documents.filter((document) => selectedSpellingDocumentIds.includes(document.id)),
    [documents, selectedSpellingDocumentIds],
  )

  const compareDocumentA = useMemo(
    () => documents.find((document) => document.id === compareDocumentAId) ?? null,
    [compareDocumentAId, documents],
  )

  const compareDocumentB = useMemo(
    () => documents.find((document) => document.id === compareDocumentBId) ?? null,
    [compareDocumentBId, documents],
  )

  const filteredWords = useMemo(() => {
    const rows = seoResult?.result.words ?? []
    const sortedRows = rows
      .filter((row) => row.length >= wordMinLength)
      .sort((left, right) => {
        if (wordSort === 'count_asc') {
          return left.count - right.count
        }
        if (wordSort === 'alpha') {
          return left.word.localeCompare(right.word, 'ru')
        }
        return right.count - left.count
      })

    return sortedRows.slice(0, wordTopN)
  }, [seoResult, wordMinLength, wordSort, wordTopN])

  const filteredNgrams = useMemo(() => {
    const rows = seoResult?.result.ngrams ?? []

    return rows
      .filter((row) => ngramSizes.includes(row.size))
      .sort((left, right) => right.count - left.count)
      .slice(0, ngramTopN)
  }, [ngramSizes, ngramTopN, seoResult])

  const corpusSummary = useMemo(
    () => ({
      words: documents.reduce((sum, document) => sum + document.raw_word_count, 0),
      chars: documents.reduce((sum, document) => sum + document.char_count, 0),
    }),
    [documents],
  )

  const canUpload = documents.length < MAX_DOCUMENTS && !isDocumentSaving

  function showMessage(nextMessage: string, variant: AppMessage['variant'] = 'info') {
    setMessage({ text: nextMessage, variant })
    window.setTimeout(() => setMessage(null), 2600)
  }

  function openFilePicker() {
    if (canUpload) {
      fileInputRef.current?.click()
    }
  }

  async function handleFiles(files: FileList | File[], context?: UploadContext) {
    const selectedFiles = Array.from(files).filter((file) => file.name.endsWith('.txt'))

    if (selectedFiles.length === 0) {
      showMessage('Выберите файл в формате .txt')
      return
    }

    const freeSlots = MAX_DOCUMENTS - documents.length
    const filesToUpload = selectedFiles.slice(0, freeSlots)

    if (filesToUpload.length === 0) {
      showMessage('Лимит документов уже достигнут')
      return
    }

    setIsDocumentSaving(true)
    try {
      const createdDocuments: DocumentItem[] = []

      for (const file of filesToUpload) {
        const content = (await readTextFile(file)).trim()

        if (!content) {
          continue
        }

        const created = await createDocument(browserId, {
          title: sanitizeDocumentTitle(file.name),
          content,
        })
        createdDocuments.push(created)
      }

      if (createdDocuments.length > 0) {
        const createdIds = createdDocuments.map((document) => document.id)

        setDocuments((current) => [...createdDocuments, ...current])
        if (!context || context === 'seo') {
          setSelectedSeoDocumentIds((current) => [
            ...createdIds,
            ...current,
          ])
        }

        if (context === 'spelling') {
          setSelectedSpellingDocumentIds((current) => [
            ...createdIds,
            ...current,
          ])
          setCurrentSpellingDocumentId((current) => current ?? createdIds[0] ?? null)
        }

        if (context === 'compare') {
          const nextAId = compareDocumentAId ?? createdIds[0] ?? null
          const nextBId = compareDocumentBId ?? createdIds.find((id) => id !== nextAId) ?? null

          setCompareDocumentAId(nextAId)
          setCompareDocumentBId(nextBId)
        }
        setSeoResult((current) => markSeoStale(current, 'Документы изменены'))
        setCompareResult((current) => markSeoStale(current, 'Документы изменены'))
        setSpellingResult((current) => markSeoStale(current, 'Документы изменены'))
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Не удалось загрузить документ')
    } finally {
      setIsDocumentSaving(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      void handleFiles(event.target.files)
    }
  }

  function openCreateDocumentModal() {
    setModal({
      mode: 'create',
      title: '',
      content: '',
    })
  }

  function openEditDocumentModal(document: DocumentItem) {
    setModal({
      mode: 'edit',
      documentId: document.id,
      title: document.title,
      content: document.content,
    })
  }

  async function handleDocumentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!modal) {
      return
    }

    const title = modal.title.trim()
    const content = modal.content.trim()

    if (!title || !content) {
      showMessage('Заполните название и текст документа')
      return
    }

    setIsDocumentSaving(true)
    try {
      if (modal.mode === 'edit' && modal.documentId) {
        const updated = await updateDocument(browserId, modal.documentId, {
          title,
          content,
        })
        setDocuments((current) =>
          current.map((document) => (document.id === updated.id ? updated : document)),
        )
      } else {
        const created = await createDocument(browserId, { title, content })
        setDocuments((current) => [created, ...current])
        setSelectedSeoDocumentIds((current) => [created.id, ...current])
      }

      setSeoResult((current) => markSeoStale(current, 'Документы изменены'))
      setCompareResult((current) => markSeoStale(current, 'Документы изменены'))
      setSpellingResult((current) => markSeoStale(current, 'Документы изменены'))
      setModal(null)
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Не удалось сохранить документ')
    } finally {
      setIsDocumentSaving(false)
    }
  }

  async function handleDeleteDocument(documentId: string) {
    setIsDocumentSaving(true)
    try {
      await deleteDocument(browserId, documentId)
      setDocuments((current) => current.filter((document) => document.id !== documentId))
      setSelectedDocumentIds((current) => current.filter((id) => id !== documentId))
      setSelectedSeoDocumentIds((current) => current.filter((id) => id !== documentId))
      setCompareDocumentAId((current) => (current === documentId ? null : current))
      setCompareDocumentBId((current) => (current === documentId ? null : current))
      setSelectedSpellingDocumentIds((current) => current.filter((id) => id !== documentId))
      setCurrentSpellingDocumentId((current) => (current === documentId ? null : current))
      setSeoResult((current) => markSeoStale(current, 'Документы изменены'))
      setCompareResult((current) => markSeoStale(current, 'Документы изменены'))
      setSpellingResult((current) => markSeoStale(current, 'Документы изменены'))
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Не удалось удалить документ')
    } finally {
      setIsDocumentSaving(false)
    }
  }

  async function handleDeleteSelectedDocuments() {
    if (selectedDocumentIds.length === 0) {
      return
    }

    setIsDocumentSaving(true)
    try {
      await Promise.all(selectedDocumentIds.map((id) => deleteDocument(browserId, id)))
      setDocuments((current) =>
        current.filter((document) => !selectedDocumentIds.includes(document.id)),
      )
      setSelectedSeoDocumentIds((current) =>
        current.filter((id) => !selectedDocumentIds.includes(id)),
      )
      setSelectedSpellingDocumentIds((current) =>
        current.filter((id) => !selectedDocumentIds.includes(id)),
      )
      setCompareDocumentAId((current) =>
        current && selectedDocumentIds.includes(current) ? null : current,
      )
      setCompareDocumentBId((current) =>
        current && selectedDocumentIds.includes(current) ? null : current,
      )
      setCurrentSpellingDocumentId((current) =>
        current && selectedDocumentIds.includes(current) ? null : current,
      )
      setSelectedDocumentIds([])
      setSeoResult((current) => markSeoStale(current, 'Документы изменены'))
      setCompareResult((current) => markSeoStale(current, 'Документы изменены'))
      setSpellingResult((current) => markSeoStale(current, 'Документы изменены'))
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Не удалось удалить документы')
    } finally {
      setIsDocumentSaving(false)
    }
  }

  function toggleDocumentSelection(documentId: string) {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    )
  }

  function toggleSeoDocument(documentId: string) {
    setSelectedSeoDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    )
  }

  function selectSpellingDocument(documentId: string) {
    setSelectedSpellingDocumentIds((current) =>
      current.includes(documentId) ? current : [...current, documentId],
    )
    setCurrentSpellingDocumentId((current) => current ?? documentId)
  }

  function removeSpellingDocument(documentId: string) {
    setSelectedSpellingDocumentIds((current) => {
      const nextIds = current.filter((id) => id !== documentId)
      setCurrentSpellingDocumentId((currentDocumentId) => {
        if (currentDocumentId !== documentId) {
          return currentDocumentId
        }
        return nextIds[0] ?? null
      })
      return nextIds
    })
  }

  function selectCompareDocumentA(documentId: string | null) {
    setCompareDocumentAId(documentId)
    setCompareResult(null)
    setCompareErrorMessage(null)
  }

  function selectCompareDocumentB(documentId: string | null) {
    setCompareDocumentBId(documentId)
    setCompareResult(null)
    setCompareErrorMessage(null)
  }

  function updateSettingsDraft(nextSettings: Partial<AnalysisSettings>) {
    setSettingsDraft((current) => ({
      ...current,
      ...nextSettings,
    }))
  }

  function setStopWordsMode(mode: StopWordsMode) {
    updateSettingsDraft({
      stop_words: {
        ...settingsDraft.stop_words,
        mode,
      },
    })
  }

  function toggleNgramSize(size: number) {
    const nextSizes = settingsDraft.ngrams.sizes.includes(size)
      ? settingsDraft.ngrams.sizes.filter((item) => item !== size)
      : [...settingsDraft.ngrams.sizes, size]

    updateSettingsDraft({
      ngrams: {
        sizes: nextSizes.sort(),
      },
    })
  }

  async function handleSaveSettings() {
    setIsSettingsSaving(true)
    try {
      const nextSettings = normalizeAnalysisSettings(settingsDraft)
      const analysisSettingsChanged = JSON.stringify(nextSettings) !== JSON.stringify(settings)
      const nextDisplaySettings = normalizeDisplaySettings(displaySettingsDraft)
      const saved = normalizeAnalysisSettings(await saveSettings(browserId, nextSettings))
      setSettings(saved)
      setSettingsDraft(saved)
      setDisplaySettings(nextDisplaySettings)
      setDisplaySettingsDraft(nextDisplaySettings)
      setWordTopN(nextDisplaySettings.topN)
      setWordMinLength(nextDisplaySettings.minLength)
      setWordSort(nextDisplaySettings.sort)
      window.localStorage.setItem(DISPLAY_SETTINGS_STORAGE_KEY, JSON.stringify(nextDisplaySettings))

      if (analysisSettingsChanged) {
        setSeoResult((current) => markSeoStale(current, 'Параметры анализа изменены'))
        setCompareResult((current) => markSeoStale(current, 'Параметры анализа изменены'))
      }

      showMessage('Параметры сохранены')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Не удалось сохранить параметры')
    } finally {
      setIsSettingsSaving(false)
    }
  }

  function resetSettingsDraft() {
    setSettingsDraft(DEFAULT_ANALYSIS_SETTINGS)
    setDisplaySettingsDraft(DEFAULT_DISPLAY_SETTINGS)
  }

  async function handleRunSeoAnalysis() {
    if (selectedSeoDocumentIds.length === 0) {
      showMessage('Выберите хотя бы один документ')
      return
    }

    setIsAnalyzing(true)
    try {
      const result = await runSeoAnalysis(browserId, selectedSeoDocumentIds, settings)
      setSeoResult(result)
      setSelectedSeoDocumentIds(result.selected_document_ids)
      showMessage('SEO-Анализ выполнен')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Не удалось выполнить анализ')
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleRunCompareAnalysis() {
    if (documents.length < 2) {
      setCompareErrorMessage('Для сравнения нужно минимум два документа')
      showMessage('Для сравнения нужно минимум два документа')
      return
    }

    if (!compareDocumentAId || !compareDocumentBId) {
      setCompareErrorMessage('Выберите два документа для сравнения')
      showMessage('Выберите два документа для сравнения')
      return
    }

    if (compareDocumentAId === compareDocumentBId) {
      setCompareErrorMessage('Для сравнения выберите разные документы')
      showMessage('Для сравнения выберите разные документы')
      return
    }

    setIsCompareAnalyzing(true)
    setCompareErrorMessage(null)
    try {
      const result = await runCompareAnalysis(browserId, compareDocumentAId, compareDocumentBId)
      setCompareResult(result)
      setCompareDocumentAId(result.selected_document_ids[0] ?? compareDocumentAId)
      setCompareDocumentBId(result.selected_document_ids[1] ?? compareDocumentBId)
      showMessage('Сравнительный анализ выполнен')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выполнить сравнительный анализ'
      setCompareErrorMessage(message)
      showMessage(message)
    } finally {
      setIsCompareAnalyzing(false)
    }
  }

  function handleClearCompare() {
    setCompareDocumentAId(null)
    setCompareDocumentBId(null)
    setCompareResult(null)
    setCompareErrorMessage(null)
  }

  async function handleRunSpellingAnalysis() {
    if (selectedSpellingDocumentIds.length === 0) {
      showMessage('Выберите хотя бы один документ')
      return
    }

    setIsSpellingAnalyzing(true)
    setSpellingErrorMessage(null)
    try {
      const result = await runSpellingAnalysis(browserId, selectedSpellingDocumentIds)
      setSpellingResult(result)
      setSelectedSpellingDocumentIds(result.selected_document_ids)
      setCurrentSpellingDocumentId(result.selected_document_ids[0] ?? null)
      showMessage('Проверка орфографии выполнена')
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Не удалось выполнить проверку орфографии'
      const message = rawMessage === 'SPELLING_ENGINE_UNAVAILABLE'
        ? 'Сервис проверки орфографии временно недоступен. Проверьте, что на сервере настроен LanguageTool/Java.'
        : rawMessage
      setSpellingErrorMessage(message)
      showMessage(message)
    } finally {
      setIsSpellingAnalyzing(false)
    }
  }

  function handleClearSpelling() {
    setSpellingResult(null)
    setSpellingErrorMessage(null)
    setSelectedSpellingDocumentIds([])
    setCurrentSpellingDocumentId(null)
  }

  async function handleCsvExport(type: SeoTableExportType) {
    setIsExporting(true)
    try {
      await downloadSeoCsv(type, browserId)
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Не удалось экспортировать CSV')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleCompareCsvExport(type: CompareTableExportType) {
    setIsExporting(true)
    try {
      await downloadCompareCsv(type, browserId)
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Не удалось экспортировать CSV')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleZipExport() {
    setIsExporting(true)
    try {
      await downloadSeoZip(browserId)
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Не удалось экспортировать ZIP')
    } finally {
      setIsExporting(false)
    }
  }

  async function copyMarkdown(markdown: string) {
    try {
      await navigator.clipboard.writeText(markdown)
      showMessage('Markdown скопирован', 'copy')
    } catch {
      showMessage('Не удалось скопировать Markdown')
    }
  }

  function copyWordsMarkdown(rows: SeoWordRow[]) {
    void copyMarkdown(
      createMarkdownTable(
        ['Слово', 'Частота', 'Плотность'],
        rows.map((row) => [row.word, row.count, `${row.density}%`]),
      ),
    )
  }

  function copyNgramsMarkdown(rows: SeoNgramRow[]) {
    void copyMarkdown(
      createMarkdownTable(
        ['Фраза', 'Размер', 'Частота', 'Плотность'],
        rows.map((row) => [row.phrase, row.size, row.count, `${row.density}%`]),
      ),
    )
  }

  function copyKeywordsMarkdown(rows: SeoKeywordRow[]) {
    void copyMarkdown(
      createMarkdownTable(
        ['Ключ', 'Найдено', 'Частота', 'Плотность', 'Статус'],
        rows.map((row) => [
          row.keyword,
          row.count > 0 ? 'Да' : 'Нет',
          row.count,
          `${row.density}%`,
          row.status,
        ]),
      ),
    )
  }

  return {
    activeTab,
    canUpload,
    compareDocumentA,
    compareDocumentAId,
    compareDocumentB,
    compareDocumentBId,
    compareErrorMessage,
    compareResult,
    corpusSummary,
    documentSearch,
    documents,
    fileInputRef,
    filteredDocuments,
    filteredNgrams,
    filteredWords,
    handleCsvExport,
    handleCompareCsvExport,
    handleDeleteDocument,
    handleDeleteSelectedDocuments,
    handleDocumentSubmit,
    handleFileInput,
    handleFiles,
    handleClearCompare,
    handleRunCompareAnalysis,
    handleRunSeoAnalysis,
    handleRunSpellingAnalysis,
    handleSaveSettings,
    handleZipExport,
    handleClearSpelling,
    isAnalyzing,
    isAppLoading,
    isCompareAnalyzing,
    isDocumentSaving,
    isExporting,
    isSpellingAnalyzing,
    isSettingsSaving,
    message,
    modal,
    ngramSizes,
    ngramTopN,
    openCreateDocumentModal,
    openEditDocumentModal,
    openFilePicker,
    resetSettingsDraft,
    selectedDocumentIds,
    selectedSeoDocumentIds,
    selectedSeoDocuments,
    selectedSpellingDocumentIds,
    selectedSpellingDocuments,
    seoResult,
    setActiveTab,
    setDocumentSearch,
    setModal,
    setNgramSizes,
    setNgramTopN,
    setSelectedDocumentIds,
    setSelectedSeoDocumentIds,
    setCompareDocumentAId,
    setCompareDocumentBId,
    setCurrentSpellingDocumentId,
    setStopWordsMode,
    setWordMinLength,
    setWordSort,
    setWordTopN,
    settings,
    settingsDraft,
    spellingErrorMessage,
    spellingResult,
    toggleDocumentSelection,
    toggleNgramSize,
    toggleSeoDocument,
    updateSettingsDraft,
    wordMinLength,
    wordSort,
    wordTopN,
    copyKeywordsMarkdown,
    copyNgramsMarkdown,
    copyWordsMarkdown,
    currentSpellingDocumentId,
    removeSpellingDocument,
    selectSpellingDocument,
    selectCompareDocumentA,
    selectCompareDocumentB,
  }
}
