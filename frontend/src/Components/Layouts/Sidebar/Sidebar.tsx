import { Files, Scale, Search, SlidersHorizontal, SpellCheck } from 'lucide-react'
import { Fragment } from 'react'
import styles from '../../../App/Styles.module.scss'
import type { TabId } from '../../../Models/ui'
import { DocumentCounter } from '../../Widgets/DocumentCounter'
import { Dropzone } from '../../UI/Dropzone'
import { LogoMark } from '../../UI/LogoMark'

const tabs: Array<{
  id: TabId
  label: string
  icon: typeof Search
}> = [
  { id: 'seo', label: 'SEO-Анализ', icon: Search },
  { id: 'compare', label: 'Сравнительный анализ', icon: Scale },
  { id: 'spelling', label: 'Проверить орфографию', icon: SpellCheck },
  { id: 'documents', label: 'Документы', icon: Files },
  { id: 'settings', label: 'Параметры', icon: SlidersHorizontal },
]

export function Sidebar({
  activeTab,
  canUpload,
  documentCount,
  onOpenFilePicker,
  onSetActiveTab,
  onUploadFiles,
}: {
  activeTab: TabId
  canUpload: boolean
  documentCount: number
  onOpenFilePicker: () => void
  onSetActiveTab: (tab: TabId) => void
  onUploadFiles: (files: FileList | File[]) => void
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logoMark}>
          <LogoMark />
        </div>
        <div className={styles.brandText}>
          <div className={styles.brandName}>Лексема</div>
          <div className={styles.brandSubtitle}>SEO-анализ текста</div>
        </div>
      </div>

      <span className={styles.sidebarDivider} aria-hidden="true" />

      <nav className={styles.nav}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Fragment key={tab.id}>
              {tab.id === 'documents' ? <span className={styles.navDivider} aria-hidden="true" /> : null}
              <button
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`${styles.navButton} ${activeTab === tab.id ? styles.navButtonActive : ''}`}
                type="button"
                title={tab.label}
                onClick={() => onSetActiveTab(tab.id)}
              >
                <Icon size={20} />
                <span className={styles.navLabel}>{tab.label}</span>
              </button>
            </Fragment>
          )
        })}
      </nav>

      <div className={styles.sidebarUpload}>
        <Dropzone
          compact
          disabled={!canUpload}
          onOpenFilePicker={onOpenFilePicker}
          onUploadFiles={onUploadFiles}
        />
      </div>

      <DocumentCounter documentCount={documentCount} />
    </aside>
  )
}
