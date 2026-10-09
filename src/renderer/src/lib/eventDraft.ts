import type { CalendarEvent, EventCreateInput } from '@shared/api'
import { addDays, addMinutes, daysBetween, minutesBetween } from '@shared/dates'
import type { EventColorId } from '@shared/eventColors'
import { toLocalIsoDate } from './date'

/** What the event form edits. Times are always 24-hour `HH:MM` (kept even while All-day is on). */
export type EventDraft = {
  title: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allDay: boolean
  color: EventColorId
  reminderEnabled: boolean
  addToTodo: boolean
}

const DEFAULT_START = '09:00'
const DEFAULT_END = '10:00'

type NewDraftOptions = {
  color: EventColorId
  now?: Date
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  allDay?: boolean
}

/** A blank draft. With no times given it starts at the next full hour and lasts one hour. */
export function newDraft(options: NewDraftOptions): EventDraft {
  const now = options.now ?? new Date()
  let startDate = options.startDate
  let startTime = options.startTime
  if (!startDate) {
    const nextHour = addMinutes(
      toLocalIsoDate(now),
      `${String(now.getHours()).padStart(2, '0')}:00`,
      60
    )
    startDate = nextHour.date
    startTime = startTime ?? nextHour.time
  }
  startTime = startTime ?? DEFAULT_START
  const end = addMinutes(startDate, startTime, 60)
  return {
    title: '',
    startDate,
    startTime,
    endDate: options.endDate ?? end.date,
    endTime: options.endTime ?? end.time,
    allDay: options.allDay ?? false,
    color: options.color,
    reminderEnabled: false,
    addToTodo: false
  }
}

export function draftFromEvent(event: CalendarEvent): EventDraft {
  return {
    title: event.title,
    startDate: event.startDate,
    startTime: event.startTime ?? DEFAULT_START,
    endDate: event.endDate,
    endTime: event.endTime ?? DEFAULT_END,
    allDay: event.allDay,
    color: event.color,
    reminderEnabled: event.reminderEnabled,
    addToTodo: event.todoId !== null
  }
}

/** Why the schedule can't be saved, or null when it's fine. */
export function scheduleError(draft: EventDraft): string | null {
  if (draft.allDay) {
    return draft.endDate < draft.startDate ? 'End date cannot be before the start date' : null
  }
  return minutesBetween(draft.startDate, draft.startTime, draft.endDate, draft.endTime) <= 0
    ? 'End must be after the start'
    : null
}

/** Changes the start but keeps the event's length, like Apple Calendar. */
export function moveStart(
  draft: EventDraft,
  change: { startDate?: string; startTime?: string }
): EventDraft {
  const startDate = change.startDate ?? draft.startDate
  const startTime = change.startTime ?? draft.startTime
  if (draft.allDay) {
    const length = Math.max(0, daysBetween(draft.startDate, draft.endDate))
    return { ...draft, startDate, startTime, endDate: addDays(startDate, length) }
  }
  let length = minutesBetween(draft.startDate, draft.startTime, draft.endDate, draft.endTime)
  if (length <= 0) {
    length = 60
  }
  const end = addMinutes(startDate, startTime, length)
  return { ...draft, startDate, startTime, endDate: end.date, endTime: end.time }
}

/** Switching All-day off must leave a valid timed range. */
export function setAllDay(draft: EventDraft, allDay: boolean): EventDraft {
  const next = { ...draft, allDay }
  if (!allDay && scheduleError(next)) {
    const end = addMinutes(next.startDate, next.startTime, 60)
    return { ...next, endDate: end.date, endTime: end.time }
  }
  return next
}

export function draftToInput(draft: EventDraft): EventCreateInput {
  return {
    title: draft.title,
    startDate: draft.startDate,
    endDate: draft.endDate,
    startTime: draft.allDay ? null : draft.startTime,
    endTime: draft.allDay ? null : draft.endTime,
    allDay: draft.allDay,
    color: draft.color,
    reminderEnabled: draft.reminderEnabled,
    addToTodo: draft.addToTodo
  }
}
