import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { flushAllSaves, hasPendingSaves, subscribePendingSaves } from '@renderer/lib/pendingSaves'
import { unwrap } from '@renderer/lib/ipc'

/** How long "Saved" stays visible after Ctrl+S. */
export const SAVED_FLASH_MS = 1500

/**
 * App-wide save handling: Ctrl/Cmd+S on any page, a small bottom-right pill that shows
 * only while edits are unsaved (or just after Ctrl+S), and a flush when the window closes.
 */
export default function SaveIndicator(): React.JSX.Element | null {
  const pending = useSyncExternalStore(subscribePendingSaves, hasPendingSaves)
  const [flash, setFlash] = useState<'saved' | 'error' | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const show = (value: 'saved' | 'error'): void => {
      setFlash(value)
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => setFlash(null), SAVED_FLASH_MS)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void (async () => {
          try {
            await flushAllSaves()
            unwrap(await window.api.app.manualSave())
            show('saved')
          } catch {
            show('error')
          }
        })()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    const unsubscribeClose = window.api.app.onBeforeClose(() => flushAllSaves())
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      unsubscribeClose()
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const label = pending
    ? 'Unsaved changes…'
    : flash === 'saved'
      ? 'Saved'
      : flash === 'error'
        ? 'Save failed'
        : null
  if (label === null) {
    return null
  }
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="save-pill"
      className="pointer-events-none fixed bottom-4 right-4 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted"
    >
      {label}
    </div>
  )
}
