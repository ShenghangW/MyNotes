import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export const AUTOSAVE_DELAY_MS = 700

type Options = {
  delayMs?: number
}

/**
 * Debounced, serialised autosave. `schedule(patch)` merges patches that arrive
 * within the delay into one save; `flush()` (Ctrl+S, back button, unmount) saves
 * immediately. Saves never overlap, so the last edit always wins.
 */
export function useAutosave<TPatch extends object>(
  save: (patch: TPatch) => Promise<void>,
  { delayMs = AUTOSAVE_DELAY_MS }: Options = {}
): {
  schedule: (patch: Partial<TPatch>) => void
  flush: () => Promise<void>
  status: SaveStatus
  error: string | null
} {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const saveRef = useRef(save)
  const pendingRef = useRef<Partial<TPatch> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chainRef = useRef<Promise<void>>(Promise.resolve())
  const mountedRef = useRef(true)

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const clearTimer = (): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const flush = useCallback((): Promise<void> => {
    clearTimer()
    const patch = pendingRef.current
    if (patch === null) {
      return chainRef.current
    }
    pendingRef.current = null

    chainRef.current = chainRef.current.then(async () => {
      if (mountedRef.current) {
        setStatus('saving')
      }
      try {
        await saveRef.current(patch as TPatch)
        if (mountedRef.current) {
          setError(null)
          // A newer edit may have arrived while saving; keep showing "pending" then.
          setStatus(pendingRef.current === null ? 'saved' : 'pending')
        }
      } catch (caught) {
        if (mountedRef.current) {
          setError(caught instanceof Error ? caught.message : String(caught))
          setStatus('error')
        }
      }
    })
    return chainRef.current
  }, [])

  const schedule = useCallback(
    (patch: Partial<TPatch>): void => {
      pendingRef.current = { ...(pendingRef.current ?? {}), ...patch }
      setStatus('pending')
      clearTimer()
      timerRef.current = setTimeout(() => {
        void flush()
      }, delayMs)
    },
    [delayMs, flush]
  )

  // Save whatever is still pending when the editor goes away or the window closes.
  useEffect(() => {
    mountedRef.current = true
    const onBeforeUnload = (): void => {
      void flush()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      void flush()
      mountedRef.current = false
    }
  }, [flush])

  return { schedule, flush, status, error }
}
