import { AppShell } from '../Components/Layouts/AppShell'
import { LoadingScreen } from '../Components/Layouts/LoadingScreen'
import { CompareAnalysisPage } from '../Components/Pages/CompareAnalysisPage'
import { DocumentsPage } from '../Components/Pages/DocumentsPage'
import { SeoAnalysisPage } from '../Components/Pages/SeoAnalysisPage'
import { SettingsPage } from '../Components/Pages/SettingsPage'
import { SpellingCheckPage } from '../Components/Pages/SpellingCheckPage'
import { DocumentModal } from '../Components/Widgets/DocumentModal'
import { useLexemaApp } from '../hooks/useLexemaApp'
import { splitTextarea } from '../Utils/lexema'

export default function App() {
  const app = useLexemaApp()

  if (app.isAppLoading) {
    return <LoadingScreen />
  }

  const documentModal = app.modal ? (
    <DocumentModal
      isSaving={app.isDocumentSaving}
      modal={app.modal}
      onChange={app.setModal}
      onClose={() => app.setModal(null)}
      onSubmit={app.handleDocumentSubmit}
    />
  ) : null

  return (
    <AppShell
      activeTab={app.activeTab}
      canUpload={app.canUpload}
      documentCount={app.documents.length}
      fileInputRef={app.fileInputRef}
      message={app.message}
      modalSlot={documentModal}
      onFileInput={app.handleFileInput}
      onOpenFilePicker={app.openFilePicker}
      onSetActiveTab={app.setActiveTab}
      onUploadFiles={app.handleFiles}
    >
      {app.activeTab === 'seo' ? (
        <SeoAnalysisPage
          documents={app.documents}
          isAnalyzing={app.isAnalyzing}
          isExporting={app.isExporting}
          onAnalyze={app.handleRunSeoAnalysis}
          onCopyKeywordsMarkdown={app.copyKeywordsMarkdown}
          onCopyNgramsMarkdown={app.copyNgramsMarkdown}
          onCopyWordsMarkdown={app.copyWordsMarkdown}
          onCsvExport={app.handleCsvExport}
          onOpenFilePicker={app.openFilePicker}
          onOpenSettings={() => app.setActiveTab('settings')}
          onUploadFiles={(files) => app.handleFiles(files, 'seo')}
          onSelectAll={() => app.setSelectedSeoDocumentIds(app.documents.map((document) => document.id))}
          onSelectNone={() => app.setSelectedSeoDocumentIds([])}
          onToggleDocument={app.toggleSeoDocument}
          selectedDocumentIds={app.selectedSeoDocumentIds}
          selectedDocuments={app.selectedSeoDocuments}
          seoResult={app.seoResult}
          settings={app.settings}
        />
      ) : null}

      {app.activeTab === 'documents' ? (
        <DocumentsPage
          canUpload={app.canUpload}
          corpusSummary={app.corpusSummary}
          documentSearch={app.documentSearch}
          documents={app.documents}
          filteredDocuments={app.filteredDocuments}
          isSaving={app.isDocumentSaving}
          onCreate={app.openCreateDocumentModal}
          onDelete={app.handleDeleteDocument}
          onDeleteSelected={app.handleDeleteSelectedDocuments}
          onEdit={app.openEditDocumentModal}
          onOpenFilePicker={app.openFilePicker}
          onSearch={app.setDocumentSearch}
          onSelect={app.toggleDocumentSelection}
          onSelectAll={(checked) =>
            app.setSelectedDocumentIds(checked ? app.filteredDocuments.map((document) => document.id) : [])
          }
          onUploadFiles={app.handleFiles}
          selectedDocumentIds={app.selectedDocumentIds}
        />
      ) : null}

      {app.activeTab === 'settings' ? (
        <SettingsPage
          draft={app.settingsDraft}
          isSaving={app.isSettingsSaving}
          onReset={app.resetSettingsDraft}
          onSave={app.handleSaveSettings}
          onSetKeywords={(value) =>
            app.updateSettingsDraft({
              keywords: splitTextarea(value),
            })
          }
          onSetLemmatization={(value) => app.updateSettingsDraft({ lemmatization: value })}
          onSetSpamThreshold={(value) =>
            app.updateSettingsDraft({
              spam: {
                threshold_percent: value,
              },
            })
          }
          onSetStopWords={(value) =>
            app.updateSettingsDraft({
              stop_words: {
                ...app.settingsDraft.stop_words,
                custom: splitTextarea(value),
              },
            })
          }
          onSetStopWordsMode={app.setStopWordsMode}
          onToggleNgramSize={app.toggleNgramSize}
        />
      ) : null}

      {app.activeTab === 'compare' ? (
        <CompareAnalysisPage
          compareDocumentAId={app.compareDocumentAId}
          compareDocumentBId={app.compareDocumentBId}
          compareResult={app.compareResult}
          documents={app.documents}
          errorMessage={app.compareErrorMessage}
          isAnalyzing={app.isCompareAnalyzing}
          isExporting={app.isExporting}
          onAnalyze={app.handleRunCompareAnalysis}
          onClear={app.handleClearCompare}
          onCsvExport={app.handleCompareCsvExport}
          onOpenDocuments={() => app.setActiveTab('documents')}
          onOpenFilePicker={app.openFilePicker}
          onOpenSettings={() => app.setActiveTab('settings')}
          onUploadFiles={(files) => app.handleFiles(files, 'compare')}
          onSelectDocumentA={app.selectCompareDocumentA}
          onSelectDocumentB={app.selectCompareDocumentB}
          settings={app.settings}
        />
      ) : null}

      {app.activeTab === 'spelling' ? (
        <SpellingCheckPage
          currentDocumentId={app.currentSpellingDocumentId}
          documents={app.documents}
          errorMessage={app.spellingErrorMessage}
          isAnalyzing={app.isSpellingAnalyzing}
          onAnalyze={app.handleRunSpellingAnalysis}
          onClear={app.handleClearSpelling}
          onOpenDocuments={() => app.setActiveTab('documents')}
          onOpenFilePicker={app.openFilePicker}
          onUploadFiles={(files) => app.handleFiles(files, 'spelling')}
          onRemoveDocument={app.removeSpellingDocument}
          onSelectDocument={app.selectSpellingDocument}
          onSetCurrentDocument={app.setCurrentSpellingDocumentId}
          selectedDocumentIds={app.selectedSpellingDocumentIds}
          selectedDocuments={app.selectedSpellingDocuments}
          spellingResult={app.spellingResult}
        />
      ) : null}
    </AppShell>
  )
}
