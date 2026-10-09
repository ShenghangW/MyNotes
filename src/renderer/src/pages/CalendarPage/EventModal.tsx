import { useEffect, useState } from 'react'
import type { CalendarEvent } from '@shared/api'
import { EVENT_COLORS } from '@shared/eventColors'
import { moveStart, scheduleError, setAllDay, type EventDraft } from '@renderer/lib/eventDraft'
import { cn } from '@renderer/lib/cn'

type EventModalProps = {
  /** The event being edited, or null when creating. */
  event: CalendarEvent | null
  initial: EventDraft
  error: string | null
  onSave: (draft: EventDraft) => Promise<boolean>
  onDelete: () => Promise<boolean>
  onClose: () => void
}

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const FIVE_MINUTES = Array.from({ length: 12 }, (_, step) => String(step * 5).padStart(2, '0'))

export const FIELD =
  'h-9 rounded-sm border border-border bg-bg px-2 text-sm text-text outline-none focus:border-accent'

/** 24-hour time picker (two dropdowns) so the clock never switches to AM/PM. */
export function TimeSelect({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (time: string) => void
}): React.JSX.Element {
  const [hour, minute] = value.split(':')
  // Keep an off-grid minute (e.g. 10:07 from a drag) selectable instead of silently changing it.
  const minutes = FIVE_MINUTES.includes(minute) ? FIVE_MINUTES : [...FIVE_MINUTES, minute].sort()
  return (
    <span className="flex items-center gap-1">
      <select
        aria-label={`${label} hour`}
        value={hour}
        className={FIELD}
        onChange={(changeEvent) => onChange(`${changeEvent.target.value}:${minute}`)}
      >
        {HOURS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-text-muted">:</span>
      <select
        aria-label={`${label} minute`}
        value={minute}
        className={FIELD}
        onChange={(changeEvent) => onChange(`${hour}:${changeEvent.target.value}`)}
      >
        {minutes.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </span>
  )
}

export default function EventModal({
  event,
  initial,
  error,
  onSave,
  onDelete,
  onClose
}: EventModalProps): React.JSX.Element {
  const [draft, setDraft] = useState<EventDraft>(initial)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    const onKeyDown = (keyEvent: KeyboardEvent): void => {
      if (keyEvent.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const problem = scheduleError(draft)
  const canSave =
    draft.title.trim() !== '' && draft.startDate !== '' && draft.endDate !== '' && !problem

  const save = async (): Promise<void> => {
    if (!canSave) {
      return
    }
    if (await onSave(draft)) {
      onClose()
    }
  }

  const remove = async (): Promise<void> => {
    if (await onDelete()) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-heading"
        className="max-h-full w-full max-w-md overflow-auto rounded-md border border-border bg-surface p-5"
      >
        <h2 id="event-modal-heading" className="text-base font-medium text-text">
          {event ? 'Edit event' : 'New event'}
        </h2>

        <div className="mt-4 space-y-4">
          <input
            autoFocus
            type="text"
            aria-label="Title"
            value={draft.title}
            maxLength={200}
            placeholder="Title"
            className="h-10 w-full rounded-sm border border-border bg-bg px-3 text-base text-text outline-none placeholder:text-text-muted focus:border-accent"
            onChange={(changeEvent) => setDraft({ ...draft, title: changeEvent.target.value })}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === 'Enter') {
                keyEvent.preventDefault()
                void save()
              }
            }}
          />

          <label className="flex items-center justify-between text-sm text-text">
            All-day
            <input
              type="checkbox"
              checked={draft.allDay}
              className="h-4 w-4 accent-accent"
              onChange={(changeEvent) => setDraft(setAllDay(draft, changeEvent.target.checked))}
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="w-12 text-sm text-text-muted">Starts</span>
              <input
                type="date"
                aria-label="Start date"
                value={draft.startDate}
                className={cn(FIELD, 'min-w-0 flex-1')}
                onChange={(changeEvent) =>
                  changeEvent.target.value
                    ? setDraft(moveStart(draft, { startDate: changeEvent.target.value }))
                    : undefined
                }
              />
              {draft.allDay ? null : (
                <TimeSelect
                  label="Start"
                  value={draft.startTime}
                  onChange={(startTime) => setDraft(moveStart(draft, { startTime }))}
                />
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="w-12 text-sm text-text-muted">Ends</span>
              <input
                type="date"
                aria-label="End date"
                value={draft.endDate}
                className={cn(FIELD, 'min-w-0 flex-1')}
                onChange={(changeEvent) =>
                  changeEvent.target.value
                    ? setDraft({ ...draft, endDate: changeEvent.target.value })
                    : undefined
                }
              />
              {draft.allDay ? null : (
                <TimeSelect
                  label="End"
                  value={draft.endTime}
                  onChange={(endTime) => setDraft({ ...draft, endTime })}
                />
              )}
            </div>
            {problem ? (
              <p className="text-xs text-accent" data-testid="schedule-problem">
                {problem}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Colour</span>
            <div className="flex items-center gap-1.5" role="group" aria-label="Colour">
              {EVENT_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  aria-label={color.label}
                  aria-pressed={draft.color === color.id}
                  title={color.label}
                  style={{ backgroundColor: color.hex }}
                  className={cn(
                    'h-5 w-5 rounded-full border-2 border-surface',
                    draft.color === color.id ? 'ring-2 ring-text' : 'ring-1 ring-border'
                  )}
                  onClick={() => setDraft({ ...draft, color: color.id })}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <label className="flex items-center justify-between text-sm text-text">
              Remind me before this event
              <input
                type="checkbox"
                checked={draft.reminderEnabled}
                className="h-4 w-4 accent-accent"
                onChange={(changeEvent) =>
                  setDraft({ ...draft, reminderEnabled: changeEvent.target.checked })
                }
              />
            </label>
            <label className="flex items-center justify-between text-sm text-text">
              <span>
                Add to to-do list
                <span className="block text-xs text-text-muted">
                  Creates a to-do due on the start date
                </span>
              </span>
              <input
                type="checkbox"
                aria-label="Add to to-do list"
                checked={draft.addToTodo}
                className="h-4 w-4 accent-accent"
                onChange={(changeEvent) =>
                  setDraft({ ...draft, addToTodo: changeEvent.target.checked })
                }
              />
            </label>
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-2">
          {event ? (
            confirmingDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-9 rounded-sm border border-accent px-3 text-sm text-accent hover:bg-hover"
                  onClick={() => void remove()}
                >
                  Confirm delete
                </button>
                <button
                  type="button"
                  className="h-9 rounded-sm px-2 text-sm text-text-muted hover:text-text"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Keep
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="h-9 rounded-sm px-2 text-sm text-text-muted hover:text-accent"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </button>
            )
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 rounded-sm border border-border bg-bg px-3 text-sm text-text hover:border-accent"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSave}
              className="h-9 rounded-sm bg-accent px-4 text-sm text-on-accent disabled:opacity-40"
              onClick={() => void save()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
