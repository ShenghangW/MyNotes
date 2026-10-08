import { useCallback, useEffect, useState } from 'react'
import type { NoteGroup } from '@shared/api'
import { errorMessage, unwrap } from '@renderer/lib/ipc'

export function useNoteGroups(): {
  groups: NoteGroup[]
  loading: boolean
  error: string | null
  clearError: () => void
  refresh: () => Promise<void>
  createGroup: (name: string) => Promise<boolean>
  renameGroup: (id: string, name: string) => Promise<boolean>
  deleteGroup: (id: string) => Promise<boolean>
} {
  const [groups, setGroups] = useState<NoteGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setGroups(unwrap(await window.api.groups.list()))
      setError(null)
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

  // Runs a mutation, then reloads the list. Returns false (and sets `error`) on failure.
  const mutate = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      try {
        await action()
        await refresh()
        return true
      } catch (caught) {
        setError(errorMessage(caught))
        return false
      }
    },
    [refresh]
  )

  const createGroup = useCallback(
    (name: string) => mutate(async () => unwrap(await window.api.groups.create({ name }))),
    [mutate]
  )
  const renameGroup = useCallback(
    (id: string, name: string) =>
      mutate(async () => unwrap(await window.api.groups.rename({ id, name }))),
    [mutate]
  )
  const deleteGroup = useCallback(
    (id: string) => mutate(async () => unwrap(await window.api.groups.delete({ id }))),
    [mutate]
  )
  const clearError = useCallback(() => setError(null), [])

  return { groups, loading, error, clearError, refresh, createGroup, renameGroup, deleteGroup }
}
