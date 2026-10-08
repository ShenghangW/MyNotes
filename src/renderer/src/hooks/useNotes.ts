import { useCallback, useEffect, useRef, useState } from 'react'
import type { Note, NotesFilter, NoteSummary } from '@shared/api'
import { errorMessage, unwrap } from '@renderer/lib/ipc'

const SEARCH_DEBOUNCE_MS = 200

export function useNotes(filter: NotesFilter = {}): {
  notes: NoteSummary[]
  loading: boolean
  error: string | null
  query: string
  setQuery: (query: string) => void
  refresh: () => Promise<void>
  createNote: (groupId?: string | null) => Promise<Note | null>
  deleteNote: (id: string) => Promise<boolean>
} {
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const queryRef = useRef(query)
  const filterRef = useRef(filter)
  const requestRef = useRef(0)
  // undefined = all, null = ungrouped, string = one group
  const filterKey = filter.groupId === undefined ? 'all' : (filter.groupId ?? 'ungrouped')

  const load = useCallback(async (): Promise<void> => {
    const requestId = ++requestRef.current
    const trimmed = queryRef.current.trim()
    const scope = { groupId: filterRef.current.groupId }
    try {
      const result = unwrap(
        trimmed
          ? await window.api.notes.search({ query: trimmed, ...scope })
          : await window.api.notes.list(scope)
      )
      if (requestId === requestRef.current) {
        setNotes(result)
        setError(null)
      }
    } catch (caught) {
      if (requestId === requestRef.current) {
        setError(errorMessage(caught))
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    queryRef.current = query
    filterRef.current = {
      groupId: filterKey === 'all' ? undefined : filterKey === 'ungrouped' ? null : filterKey
    }
    const timer = setTimeout(
      () => {
        void load()
      },
      query.trim() === '' ? 0 : SEARCH_DEBOUNCE_MS
    )
    return () => clearTimeout(timer)
  }, [query, filterKey, load])

  const createNote = useCallback(async (groupId?: string | null): Promise<Note | null> => {
    try {
      const note = unwrap(await window.api.notes.create(groupId ? { groupId } : undefined))
      setError(null)
      return note
    } catch (caught) {
      setError(errorMessage(caught))
      return null
    }
  }, [])

  const deleteNote = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        unwrap(await window.api.notes.delete({ id }))
        await load()
        return true
      } catch (caught) {
        setError(errorMessage(caught))
        return false
      }
    },
    [load]
  )

  return { notes, loading, error, query, setQuery, refresh: load, createNote, deleteNote }
}
