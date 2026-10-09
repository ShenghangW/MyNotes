import { useState } from 'react'
import type { TimetableEntry } from '@shared/api'
import { eventColorHex, nextEventColor } from '@shared/eventColors'
import { IconPlus } from '@renderer/components/icons'
import { useTimetable } from '@renderer/hooks/useTimetable'
import { cn } from '@renderer/lib/cn'
import {
  blockPosition,
  draftFromEntry,
  draftToCreate,
  draftToUpdate,
  gridRange,
  layoutDay,
  HOUR_PX,
  newTimetableDraft,
  timeFromOffset,
  WEEKDAYS,
  weekdayIndex,
  type TimetableDraft
} from '@renderer/lib/timetable'
import ClassModal from './ClassModal'

type ModalState = { entry: TimetableEntry | null; draft: TimetableDraft } | null

export default function TimetablePage(): React.JSX.Element {
  const { entries, error, clearError, addClass, updateClass, deleteClass } = useTimetable()
  const [modal, setModal] = useState<ModalState>(null)

  const { firstHour, lastHour } = gridRange(entries)
  const hours = Array.from({ length: lastHour - firstHour }, (_, index) => firstHour + index)
  const gridHeight = hours.length * HOUR_PX
  const today = weekdayIndex()

  const openCreate = (options: { day?: number; startTime?: string } = {}): void => {
    clearError()
    setModal({
      entry: null,
      draft: newTimetableDraft({ ...options, color: nextEventColor(entries.length) })
    })
  }

  const openEdit = (entry: TimetableEntry): void => {
    clearError()
    setModal({ entry, draft: draftFromEntry(entry) })
  }

  const handleSave = (draft: TimetableDraft): Promise<boolean> =>
    modal?.entry
      ? updateClass(draftToUpdate(modal.entry.id, draft))
      : addClass(draftToCreate(draft))

  const handleDelete = async (): Promise<boolean> =>
    modal?.entry ? deleteClass(modal.entry.id) : false

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-medium tracking-tight">Timetable</h1>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-sm border border-border bg-surface px-3 text-sm text-text hover:border-accent hover:text-accent"
          onClick={() => openCreate()}
        >
          <IconPlus className="h-4 w-4" />
          Add class
        </button>
      </div>

      {error && !modal ? (
        <p className="mt-3 text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 h-[calc(100vh-11rem)] min-h-[420px] overflow-auto rounded-md border border-border bg-surface">
        <div className="min-w-[760px]">
          <div className="sticky top-0 z-10 flex border-b border-border bg-surface">
            <div className="w-14 shrink-0" />
            {WEEKDAYS.map((weekday, day) => (
              <div
                key={weekday.long}
                className={cn(
                  'flex-1 border-l border-border py-2 text-center text-sm',
                  day === today ? 'bg-bg font-medium text-text' : 'text-text-muted'
                )}
              >
                {weekday.long}
              </div>
            ))}
          </div>

          <div className="flex">
            <div className="relative w-14 shrink-0" style={{ height: gridHeight }}>
              {hours.map((hour) => (
                <span
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-xs text-text-muted first:translate-y-0"
                  style={{ top: (hour - firstHour) * HOUR_PX }}
                >
                  {String(hour).padStart(2, '0')}:00
                </span>
              ))}
            </div>

            {WEEKDAYS.map((weekday, day) => (
              <div
                key={weekday.long}
                role="group"
                aria-label={`${weekday.long} classes`}
                title={`Add a class on ${weekday.long}`}
                className={cn(
                  'relative flex-1 cursor-pointer border-l border-border',
                  day === today ? 'bg-bg' : undefined
                )}
                style={{ height: gridHeight }}
                onClick={(clickEvent) => {
                  const top = clickEvent.currentTarget.getBoundingClientRect().top
                  openCreate({
                    day,
                    startTime: timeFromOffset(clickEvent.clientY - top, firstHour)
                  })
                }}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="pointer-events-none absolute inset-x-0 border-t border-border"
                    style={{ top: (hour - firstHour) * HOUR_PX }}
                  />
                ))}
                {(() => {
                  const dayEntries = entries.filter((entry) => entry.dayOfWeek === day)
                  const lanes = layoutDay(dayEntries)
                  return dayEntries.map((entry) => {
                    const { top, height } = blockPosition(entry, firstHour)
                    const { lane, lanes: laneCount } = lanes.get(entry.id) ?? { lane: 0, lanes: 1 }
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        title={[
                          entry.title,
                          `${entry.startTime}–${entry.endTime}`,
                          entry.description
                        ]
                          .filter(Boolean)
                          .join('\n')}
                        className="absolute overflow-hidden rounded-sm px-2 py-1 text-left text-xs leading-snug text-white"
                        style={{
                          top: top + 1,
                          height: height - 2,
                          left: `calc(${(lane / laneCount) * 100}% + 4px)`,
                          width: `calc(${100 / laneCount}% - 8px)`,
                          backgroundColor: eventColorHex(entry.color)
                        }}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation()
                          openEdit(entry)
                        }}
                      >
                        <span className="block font-medium">{entry.title}</span>
                        <span className="block opacity-90">
                          {entry.startTime}–{entry.endTime}
                        </span>
                        {entry.description ? (
                          <span className="mt-0.5 block whitespace-pre-line opacity-90">
                            {entry.description}
                          </span>
                        ) : null}
                      </button>
                    )
                  })
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal ? (
        <ClassModal
          entry={modal.entry}
          initial={modal.draft}
          error={error}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      ) : null}
    </section>
  )
}
