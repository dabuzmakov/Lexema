import { Download, Gauge, KeyRound, ListChecks, UploadCloud } from 'lucide-react'
import styles from '../../../../App/Styles.module.scss'
import { PageHeader } from '../../../Layouts/PageHeader'
import { SilentDropUploadArea } from '../../../Widgets/SilentDropUploadArea'

export function SeoWelcomeState({
  onOpenFilePicker,
  onUploadFiles,
}: {
  onOpenFilePicker: () => void
  onUploadFiles: (files: FileList | File[]) => void
}) {
  const steps = [
    ['Загрузите текст', 'Добавьте .txt-файлы или вставьте документ вручную во вкладке «Документы».'],
    ['Настройте анализ', 'При необходимости задайте ключи, стоп-слова, N-граммы и порог переспама.'],
    ['Получите отчет', 'Запустите SEO-анализ и изучите частотность, водность, переспам и структуру.'],
  ]

  const capabilities = [
    ['Ключи', 'Покрытие и частотность заданных слов и фраз.'],
    ['N-граммы', 'Повторяющиеся фразы и плотность в тексте.'],
    ['Водность', 'Доля слабых слов и маркеров без смысловой нагрузки.'],
    ['Экспорт', 'CSV, Markdown и PNG для отчета и отдельных блоков.'],
  ]

  return (
    <div className={`${styles.pageStack} ${styles.seoWelcomePage}`}>
      <PageHeader
        title="SEO-анализ"
        text="Загрузите документы, чтобы проверить текст перед публикацией"
      />

      <SilentDropUploadArea onUploadFiles={onUploadFiles}>
        <section className={styles.seoWelcomePanel}>
        <div className={styles.seoWelcomeStart}>
          <span className={styles.seoWelcomeIcon}>
            <UploadCloud size={28} />
          </span>
          <div>
            <h2>Документы еще не загружены</h2>
            <p>Начните с добавления текста. После загрузки здесь появятся выбор документов, настройки запуска и SEO-отчет.</p>
          </div>
          <button className={styles.primaryButton} type="button" onClick={onOpenFilePicker}>
            <UploadCloud size={18} />
            Загрузить текст
          </button>
        </div>

        <div className={styles.seoWelcomeSteps}>
          {steps.map(([title, text], index) => (
            <article className={styles.seoWelcomeStep} key={title}>
              <strong>{index + 1}</strong>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
        </section>
      </SilentDropUploadArea>

      <section className={styles.seoWelcomeCapabilities}>
        {capabilities.map(([title, text], index) => (
          <article className={styles.capabilityCard} key={title}>
            <span className={styles.smallIconBubble}>
              {index === 0 ? <KeyRound /> : index === 1 ? <ListChecks /> : index === 2 ? <Gauge /> : <Download />}
            </span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
