import { useEffect, useMemo } from 'react'
import { eventColorHex } from '@shared/eventColors'
import { TODOS_CHANGED, useTodos } from '@renderer/hooks/useTodos'
import { useEvents } from '@renderer/hooks/useEvents'
import { toLocalIsoDate } from '@renderer/lib/date'
import { buildUpcoming, dayLabel } from '@renderer/lib/upcoming'

type UpcomingWidgetProps = { onOpenCalendar?: () => void }

/** The next 7 days: events plus unfinished to-dos that are due. Click a day to open the Calendar. */
export default function UpcomingWidget({ onOpenCalendar }: UpcomingWidgetProps): React.JSX.Element {
  const { events } = useEvents()
  const { todos, reload } = useTodos()

  // The to-do list beside this widget can change a to-do's state; keep up with it.
  useEffect(() => {
    const onChange = (): void => void reload()
    window.addEventListener(TODOS_CHANGED, onChange)
    return () => window.removeEventListener(TODOS_CHANGED, onChange)
  }, [reload])

  const today = toLocalIsoDate()
  const days = useMemo(() => buildUpcoming(events, todos, today), [events, todos, today])

  return (
    <section
      aria-labelledby="upcoming-heading"
      className="rounded-md border border-border bg-surface p-4"
    >
      <h2 id="upcoming-heading" className="text-sm font-medium text-text">
        Next 7 days
      </h2>
      <ul className="mt-3 space-y-1">
        {days.map((day) => (
          <li key={day.date}>
            <button
              type="button"
              aria-label={`${dayLabel(day.date, today)}: open calendar`}
              className="w-full rounded-sm px-2 py-1.5 text-left hover:bg-bg"
              onClick={onOpenCalendar}
            >
              <span className="text-xs font-medium text-text-muted">
                {dayLabel(day.date, today)}
              </span>
              {day.items.length === 0 ? (
                <span className="block text-sm text-text-muted opacity-60">Nothing planned</span>
              ) : (
                <span className="mt-0.5 block space-y-0.5">
                  {day.items.map((item) => (
                    <span key={item.key} className="flex items-center gap-2 text-sm text-text">
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full border border-border"
                        style={
                          item.color ? { backgroundColor: eventColorHex(item.color) } : undefined
                        }
                      />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      <span className="shrink-0 text-xs text-text-muted">
                        {item.kind === 'todo' ? 'To-do' : item.when}
                      </span>
                    </span>
                  ))}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
