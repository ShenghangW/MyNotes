import { useEffect, useState } from 'react'
import type { TimetableEntry } from '@shared/api'
import { EVENT_COLORS } from '@shared/eventColors'
import { cn } from '@renderer/lib/cn'
import { moveStart, timeError, WEEKDAYS, type TimetableDraft } from '@renderer/lib/timetable'
import { FIELD, TimeSelect } from '../CalendarPage/EventModal'

type ClassModalProps = {
  /** The class being edited, or null when adding. */
  entry: TimetableEntry | null
  initial: TimetableDraft
  error: string | null
  onSave: (draft: TimetableDraft) => Promise<boolean>
  onDelete: () => Promise<boolean>
  onClose: () => void
}

export default function ClassModal({
  entry,
  initial,
  error,
  onSave,
  onDelete,
  onClose
}: ClassModalProps): React.JSX.Element {
  const [draft, setDraft] = useState<TimetableDraft>(initial)
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

  const problem = timeError(draft)
  const canSave = draft.title.trim() !== '' && draft.days.length > 0 && !problem

  // Adding can pick several days at once; editing moves this one class, so it's a single choice.
  const toggleDay = (day: number): void => {
    if (entry) {
      setDraft({ ...draft, days: [day] })
      return
    }
    const days = draft.days.includes(day)
      ? draft.days.filter((chosen) => chosen !== day)
      : [...draft.days, day].sort()
    setDraft({ ...draft, days })
  }

  const save = async (): Promise<void> => {
    if (canSave && (await onSave(draft))) {
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
        aria-labelledby="class-modal-heading"
        className="max-h-full w-full max-w-md overflow-auto rounded-md border border-border bg-surface p-5"
      >
        <h2 id="class-modal-heading" className="text-base font-medium text-text">
          {entry ? 'Edit class' : 'New class'}
        </h2>

        <div className="mt-4 space-y-4">
          <input
            autoFocus
            type="text"
            aria-label="Title"
            value={draft.title}
            maxLength={200}
            placeholder="Course title"
            className="h-10 w-full rounded-sm border border-border bg-bg px-3 text-base text-text outline-none placeholder:text-text-muted focus:border-accent"
            onChange={(changeEvent) => setDraft({ ...draft, title: changeEvent.target.value })}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === 'Enter') {
                keyEvent.preventDefault()
                void save()
              }
            }}
          />

          <div>
            <span className="text-sm text-text-muted">{entry ? 'Day' : 'Days'}</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Days">
              {WEEKDAYS.map((weekday, day) => (
                <button
                  key={weekday.long}
                  type="button"
                  aria-label={weekday.long}
                  aria-pressed={draft.days.includes(day)}
                  className={cn(
                    'h-8 rounded-sm border px-2.5 text-sm',
                    draft.days.includes(day)
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-border bg-bg text-text hover:border-accent'
                  )}
                  onClick={() => toggleDay(day)}
                >
                  {weekday.short}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="w-12 text-sm text-text-muted">From</span>
              <TimeSelect
                label="Start"
                value={draft.startTime}
                onChange={(startTime) => setDraft(moveStart(draft, startTime))}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="w-12 text-sm text-text-muted">To</span>
              <TimeSelect
                label="End"
                value={draft.endTime}
                onChange={(endTime) => setDraft({ ...draft, endTime })}
              />
            </div>
            {problem ? (
              <p className="text-xs text-accent" data-testid="time-problem">
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

          <textarea
            aria-label="Description"
            value={draft.description}
            maxLength={1000}
            rows={3}
            placeholder="Description (optional): room, lecturer, notes…"
            className={cn(FIELD, 'h-auto w-full resize-none py-2 placeholder:text-text-muted')}
            onChange={(changeEvent) =>
              setDraft({ ...draft, description: changeEvent.target.value })
            }
          />
        </div>

        {error ? (
          <p className="mt-3 text-sm text-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-2">
          {entry ? (
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
