import { useMemo, useState } from 'react'
import { eventColorHex } from '@shared/eventColors'
import { IconChevronDown } from '@renderer/components/icons'
import { useEvents } from '@renderer/hooks/useEvents'
import { usePersistedFlag } from '@renderer/hooks/usePersistedFlag'
import { cn } from '@renderer/lib/cn'
import { toLocalIsoDate } from '@renderer/lib/date'
import { describeUpcoming, listUpcomingEvents } from '@renderer/lib/upcoming'

/** How many upcoming events Home shows until the list is expanded. */
export const COLLAPSED_EVENTS = 3

type UpcomingWidgetProps = { onOpenCalendar?: () => void }

/** Every event still to come, soonest first. Click one to open the Calendar. */
export default function UpcomingWidget({ onOpenCalendar }: UpcomingWidgetProps): React.JSX.Element {
  const { events, loading } = useEvents()
  const [expanded, setExpanded] = useState(false)
  const [folded, toggleFolded] = usePersistedFlag('home.upcoming.folded', false)

  const today = toLocalIsoDate()
  const upcoming = useMemo(() => listUpcomingEvents(events, today), [events, today])
  const visible = expanded ? upcoming : upcoming.slice(0, COLLAPSED_EVENTS)
  const hiddenCount = upcoming.length - visible.length

  return (
    <section
      aria-labelledby="upcoming-heading"
      className="rounded-md border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={folded ? 'Unfold upcoming events' : 'Fold upcoming events'}
            title={folded ? 'Unfold' : 'Fold'}
            aria-expanded={!folded}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-text-muted hover:text-accent"
            onClick={toggleFolded}
          >
            <IconChevronDown
              className={cn('h-4 w-4 transition-transform', !folded && 'rotate-180')}
            />
          </button>
          <h2 id="upcoming-heading" className="text-sm font-medium text-text">
            Upcoming events
          </h2>
        </div>
        {folded && upcoming.length > 0 ? (
          <span className="text-xs text-text-muted">{upcoming.length} upcoming</span>
        ) : null}
      </div>

      {folded ? null : (
        <>
          {!loading && upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">No upcoming events.</p>
          ) : null}

          <ul className="mt-3 space-y-1">
            {visible.map((event) => {
              const info = describeUpcoming(event, today)
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    aria-label={`${event.title}: open calendar`}
                    className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-bg"
                    onClick={onOpenCalendar}
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: eventColorHex(event.color) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text">{event.title}</span>
                      <span className="block text-xs text-text-muted">
                        {info.dates} · {info.time}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-xs',
                        info.label === 'Today' ? 'font-medium text-accent' : 'text-text-muted'
                      )}
                    >
                      {info.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {upcoming.length > COLLAPSED_EVENTS ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={
                expanded ? 'Show fewer events' : `Show all ${upcoming.length} upcoming events`
              }
              title={expanded ? 'Show fewer' : 'Show all'}
              className="mx-auto mt-2 flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-text-muted hover:text-accent"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? null : <span>{hiddenCount} more</span>}
              <IconChevronDown
                className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
              />
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}
