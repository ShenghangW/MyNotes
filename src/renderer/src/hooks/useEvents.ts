import { useCallback, useEffect, useState } from 'react'
import type { CalendarEvent, EventCreateInput, EventUpdateInput } from '@shared/api'
import { errorMessage, unwrap } from '@renderer/lib/ipc'

/** Fired after any event is created, edited, or deleted so the reminder popup can re-check. */
export const EVENTS_CHANGED = 'mynote:events-changed'

function notifyChanged(): void {
  window.dispatchEvent(new Event(EVENTS_CHANGED))
}

export function useEvents(): {
  events: CalendarEvent[]
  loading: boolean
  error: string | null
  clearError: () => void
  addEvent: (input: EventCreateInput) => Promise<boolean>
  updateEvent: (patch: EventUpdateInput) => Promise<boolean>
  deleteEvent: (id: string) => Promise<boolean>
} {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setEvents(unwrap(await window.api.events.list()))
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

  const addEvent = useCallback(async (input: EventCreateInput): Promise<boolean> => {
    try {
      const created = unwrap(await window.api.events.create(input))
      setEvents((current) => [...current, created])
      setError(null)
      notifyChanged()
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      return false
    }
  }, [])

  const updateEvent = useCallback(async (patch: EventUpdateInput): Promise<boolean> => {
    try {
      const saved = unwrap(await window.api.events.update(patch))
      setEvents((current) => current.map((event) => (event.id === saved.id ? saved : event)))
      setError(null)
      notifyChanged()
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      return false
    }
  }, [])

  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    try {
      unwrap(await window.api.events.delete({ id }))
      setEvents((current) => current.filter((event) => event.id !== id))
      setError(null)
      notifyChanged()
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      return false
    }
  }, [])

  return { events, loading, error, clearError, addEvent, updateEvent, deleteEvent }
}
