import type { TimetableCreateInput, TimetableEntry, TimetableUpdateInput } from '@shared/api'
import { minutesToTime, timeToMinutes } from '@shared/dates'
import type { EventColorId } from '@shared/eventColors'

/** Monday first, matching `day_of_week` (0 = Monday … 6 = Sunday). */
export const WEEKDAYS = [
  { short: 'Mon', long: 'Monday' },
  { short: 'Tue', long: 'Tuesday' },
  { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' },
  { short: 'Fri', long: 'Friday' },
  { short: 'Sat', long: 'Saturday' },
  { short: 'Sun', long: 'Sunday' }
] as const

export const HOUR_PX = 56
const DEFAULT_FIRST_HOUR = 8
const DEFAULT_LAST_HOUR = 18
const LAST_START_MINUTES = 23 * 60 + 55

/** What the class form edits. Times are 24-hour `HH:MM`. */
export type TimetableDraft = {
  title: string
  days: number[]
  startTime: string
  endTime: string
  description: string
  color: EventColorId
}

/** 0 = Monday … 6 = Sunday for a JS Date. */
export function weekdayIndex(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7
}

/** The hours the grid shows: 08:00–18:00 by default, widened to fit every class. */
export function gridRange(entries: TimetableEntry[]): { firstHour: number; lastHour: number } {
  let firstHour = DEFAULT_FIRST_HOUR
  let lastHour = DEFAULT_LAST_HOUR
  for (const entry of entries) {
    firstHour = Math.min(firstHour, Math.floor(timeToMinutes(entry.startTime) / 60))
    lastHour = Math.max(lastHour, Math.ceil(timeToMinutes(entry.endTime) / 60))
  }
  return { firstHour, lastHour }
}

/** Where a class sits in its day column, in pixels. */
export function blockPosition(
  entry: TimetableEntry,
  firstHour: number
): { top: number; height: number } {
  const start = timeToMinutes(entry.startTime)
  const end = timeToMinutes(entry.endTime)
  return {
    top: ((start - firstHour * 60) * HOUR_PX) / 60,
    height: ((end - start) * HOUR_PX) / 60
  }
}

/**
 * Splits a day's classes into side-by-side lanes. Classes that overlap (directly or through a
 * chain of other classes) share the column width; a class with no clash gets all of it.
 */
export function layoutDay(entries: TimetableEntry[]): Map<string, { lane: number; lanes: number }> {
  const sorted = [...entries].sort(
    (a, b) =>
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime) ||
      timeToMinutes(a.endTime) - timeToMinutes(b.endTime)
  )
  const result = new Map<string, { lane: number; lanes: number }>()
  let cluster: { id: string; lane: number }[] = []
  let laneEnds: number[] = []
  let clusterEnd = 0

  const flush = (): void => {
    for (const item of cluster) {
      result.set(item.id, { lane: item.lane, lanes: laneEnds.length })
    }
    cluster = []
    laneEnds = []
  }

  for (const entry of sorted) {
    const start = timeToMinutes(entry.startTime)
    const end = timeToMinutes(entry.endTime)
    if (cluster.length > 0 && start >= clusterEnd) {
      flush()
    }
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }
    cluster.push({ id: entry.id, lane })
    clusterEnd = cluster.length === 1 ? end : Math.max(clusterEnd, end)
  }
  flush()
  return result
}

/** A click `offsetY` pixels down the column -> the half hour it landed in. */
export function timeFromOffset(offsetY: number, firstHour: number): string {
  const minutes = firstHour * 60 + Math.floor((Math.max(0, offsetY) / HOUR_PX) * 2) * 30
  return minutesToTime(Math.min(minutes, LAST_START_MINUTES))
}

function plusMinutes(time: string, minutes: number): string {
  return minutesToTime(Math.min(timeToMinutes(time) + minutes, LAST_START_MINUTES))
}

export function newTimetableDraft(options: {
  color: EventColorId
  day?: number
  startTime?: string
}): TimetableDraft {
  const startTime = options.startTime ?? '09:00'
  return {
    title: '',
    days: options.day === undefined ? [] : [options.day],
    startTime,
    endTime: plusMinutes(startTime, 60),
    description: '',
    color: options.color
  }
}

export function draftFromEntry(entry: TimetableEntry): TimetableDraft {
  return {
    title: entry.title,
    days: [entry.dayOfWeek],
    startTime: entry.startTime,
    endTime: entry.endTime,
    description: entry.description ?? '',
    color: entry.color
  }
}

/** Changes the start but keeps the class length, so the end follows. */
export function moveStart(draft: TimetableDraft, startTime: string): TimetableDraft {
  let length = timeToMinutes(draft.endTime) - timeToMinutes(draft.startTime)
  if (length <= 0) {
    length = 60
  }
  return { ...draft, startTime, endTime: plusMinutes(startTime, length) }
}

/** Why the times can't be saved, or null when they're fine. */
export function timeError(draft: TimetableDraft): string | null {
  return timeToMinutes(draft.endTime) <= timeToMinutes(draft.startTime)
    ? 'End time must be after the start time'
    : null
}

export function draftToCreate(draft: TimetableDraft): TimetableCreateInput {
  return {
    title: draft.title,
    days: draft.days,
    startTime: draft.startTime,
    endTime: draft.endTime,
    description: draft.description,
    color: draft.color
  }
}

export function draftToUpdate(id: string, draft: TimetableDraft): TimetableUpdateInput {
  return {
    id,
    title: draft.title,
    dayOfWeek: draft.days[0],
    startTime: draft.startTime,
    endTime: draft.endTime,
    description: draft.description,
    color: draft.color
  }
}
