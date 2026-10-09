import { useCallback, useEffect, useState } from 'react'
import type { DueReminder } from '@shared/api'
import { describeDaysUntil } from '@shared/reminders'
import { EVENTS_CHANGED } from '@renderer/hooks/useEvents'
import { errorMessage, unwrap } from '@renderer/lib/ipc'

/** How often to re-check while the app stays open (also catches the date rolling over). */
export const REMINDER_CHECK_MS = 20 * 60 * 1000

export default function ReminderPopup(): React.JSX.Element | null {
  const [reminders, setReminders] = useState<DueReminder[]>([])
  const [error, setError] = useState<string | null>(null)

  const check = useCallback(async (): Promise<void> => {
    try {
      setReminders(unwrap(await window.api.events.listDueReminders()))
    } catch {
      // A failed background check should never block the app; try again next time.
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check()
    const timer = window.setInterval(() => void check(), REMINDER_CHECK_MS)
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') {
        void check()
      }
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener(EVENTS_CHANGED, onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(EVENTS_CHANGED, onVisible)
    }
  }, [check])

  const dismiss = async (eventId: string): Promise<void> => {
    try {
      unwrap(await window.api.events.dismissReminder({ eventId }))
      setReminders((current) => current.filter((item) => item.event.id !== eventId))
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  const dismissAll = async (): Promise<void> => {
    for (const item of reminders) {
      await dismiss(item.event.id)
    }
  }

  if (reminders.length === 0) {
    return null
  }

  return (
    <aside
      role="region"
      aria-label="Event reminders"
      className="fixed bottom-4 right-4 z-50 w-80 rounded-md border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-medium text-text">
        {reminders.length === 1 ? 'Upcoming event' : `${reminders.length} upcoming events`}
      </h2>

      <ul className="mt-2 divide-y divide-border">
        {reminders.map(({ event, daysUntil }) => (
          <li key={event.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm text-text">{event.title}</p>
              <p className="text-xs font-medium text-accent">{describeDaysUntil(daysUntil)}</p>
            </div>
            <button
              type="button"
              aria-label={`Dismiss reminder for "${event.title}"`}
              className="h-7 shrink-0 rounded-sm border border-border px-2 text-xs text-text hover:border-accent hover:text-accent"
              onClick={() => void dismiss(event.id)}
            >
              Dismiss
            </button>
          </li>
        ))}
      </ul>

      {reminders.length > 1 ? (
        <button
          type="button"
          className="mt-2 text-xs text-text-muted hover:text-accent"
          onClick={() => void dismissAll()}
        >
          Dismiss all
        </button>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-text" role="alert">
          {error}
        </p>
      ) : null}
    </aside>
  )
}
