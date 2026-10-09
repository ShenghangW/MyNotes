import { useCallback, useEffect, useState } from 'react'
import type { TimetableCreateInput, TimetableEntry, TimetableUpdateInput } from '@shared/api'
import { errorMessage, unwrap } from '@renderer/lib/ipc'

export function useTimetable(): {
  entries: TimetableEntry[]
  loading: boolean
  error: string | null
  clearError: () => void
  addClass: (input: TimetableCreateInput) => Promise<boolean>
  updateClass: (patch: TimetableUpdateInput) => Promise<boolean>
  deleteClass: (id: string) => Promise<boolean>
} {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // The main process owns the sort order, so every change reloads the list.
  const refresh = useCallback(async (): Promise<void> => {
    try {
      setEntries(unwrap(await window.api.timetable.list()))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const clearError = useCallback(() => setError(null), [])

  const run = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      try {
        await action()
        setError(null)
        await refresh()
        return true
      } catch (caught) {
        setError(errorMessage(caught))
        return false
      }
    },
    [refresh]
  )

  const addClass = useCallback(
    (input: TimetableCreateInput) =>
      run(async () => unwrap(await window.api.timetable.create(input))),
    [run]
  )
  const updateClass = useCallback(
    (patch: TimetableUpdateInput) =>
      run(async () => unwrap(await window.api.timetable.update(patch))),
    [run]
  )
  const deleteClass = useCallback(
    (id: string) => run(async () => unwrap(await window.api.timetable.delete({ id }))),
    [run]
  )

  return { entries, loading, error, clearError, addClass, updateClass, deleteClass }
}
