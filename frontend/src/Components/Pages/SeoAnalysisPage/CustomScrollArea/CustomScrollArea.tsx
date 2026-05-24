import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styles from '../../../../App/Styles.module.scss'
import { CUSTOM_SCROLLBAR_INSET } from '../constants'

export function CustomScrollArea({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const [thumb, setThumb] = useState({ height: 0, offset: 0 })
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)

  function updateCustomScrollbar() {
    const element = scrollAreaRef.current

    if (!element) {
      return
    }

    const { clientHeight, scrollHeight, scrollTop } = element

    if (scrollHeight <= clientHeight + 1) {
      setThumb((current) => (current.height === 0 && current.offset === 0 ? current : { height: 0, offset: 0 }))
      return
    }

    const trackHeight = Math.max(clientHeight - CUSTOM_SCROLLBAR_INSET * 2, 0)
    const ratio = clientHeight / scrollHeight
    const thumbHeight = Math.min(trackHeight, Math.max(trackHeight * ratio, 24))
    const maxOffset = trackHeight - thumbHeight
    const maxScroll = scrollHeight - clientHeight
    const thumbOffset = maxScroll > 0 ? (scrollTop / maxScroll) * maxOffset : 0
    const nextThumb = { height: thumbHeight, offset: thumbOffset }

    setThumb((current) =>
      Math.abs(current.height - nextThumb.height) < 0.5 && Math.abs(current.offset - nextThumb.offset) < 0.5
        ? current
        : nextThumb,
    )
  }

  useEffect(() => {
    updateCustomScrollbar()
  })

  useEffect(() => {
    const element = scrollAreaRef.current

    if (!element) {
      return
    }

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateCustomScrollbar)

    resizeObserver?.observe(element)

    Array.from(element.children).forEach((child) => {
      resizeObserver?.observe(child)
    })

    window.addEventListener('resize', updateCustomScrollbar)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateCustomScrollbar)
    }
  }, [])

  return (
    <div className={`${styles.customScrollArea} ${className ?? ''}`}>
      <div
        ref={scrollAreaRef}
        className={styles.customScrollViewport}
        onScroll={updateCustomScrollbar}
      >
        {children}
      </div>
      {thumb.height > 0 ? (
        <div className={styles.customScrollTrack} aria-hidden="true">
          <div
            className={styles.customScrollThumb}
            style={{
              height: `${thumb.height}px`,
              transform: `translateY(${thumb.offset}px)`,
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
