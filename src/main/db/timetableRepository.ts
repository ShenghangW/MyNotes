import { randomUUID } from 'node:crypto'
import type { SqlValue } from 'sql.js'
import type { TimetableCreateInput, TimetableEntry, TimetableUpdateInput } from '../../shared/api'
import { isValidTime, minutesToTime, timeToMinutes } from '../../shared/dates'
import { DEFAULT_EVENT_COLOR, isEventColor, type EventColorId } from '../../shared/eventColors'
import type { AppDatabase } from './database'

type EntryRow = Record<string, SqlValue>

const COLUMNS = 'id, day_of_week, start_minutes, end_minutes, title, description, color, updated_at'
const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 1000

function toEntry(row: EntryRow): TimetableEntry {
  return {
    id: String(row.id),
    dayOfWeek: Number(row.day_of_week),
    startTime: minutesToTime(Number(row.start_minutes)),
    endTime: minutesToTime(Number(row.end_minutes)),
    title: String(row.title),
    description: typeof row.description === 'string' ? row.description : null,
    color: isEventColor(row.color) ? row.color : DEFAULT_EVENT_COLOR,
    updatedAt: String(row.updated_at)
  }
}

function cleanTitle(title: string | undefined): string {
  const trimmed = (title ?? '').trim()
  if (trimmed === '') {
    throw new Error('Class title cannot be empty')
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new Error(`Class title must be ${MAX_TITLE_LENGTH} characters or fewer`)
  }
  return trimmed
}

function cleanDescription(description: string | null | undefined): string | null {
  const trimmed = (description ?? '').trim()
  if (trimmed === '') {
    return null
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`)
  }
  return trimmed
}

function cleanDay(day: number): number {
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw new Error('Day must be between Monday and Sunday')
  }
  return day
}

/** Both times must be valid 24-hour times, and the class must end after it starts (same day). */
function cleanTimes(startTime: string | undefined, endTime: string | undefined): [number, number] {
  if (!startTime || !isValidTime(startTime)) {
    throw new Error('Start time must be a 24-hour time (HH:MM)')
  }
  if (!endTime || !isValidTime(endTime)) {
    throw new Error('End time must be a 24-hour time (HH:MM)')
  }
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (end <= start) {
    throw new Error('End time must be after the start time')
  }
  return [start, end]
}

export function listTimetable(db: AppDatabase): TimetableEntry[] {
  return db
    .all<EntryRow>(
      `SELECT ${COLUMNS} FROM timetable_entries ORDER BY day_of_week ASC, start_minutes ASC, title ASC`
    )
    .map(toEntry)
}

export function getTimetableEntry(db: AppDatabase, id: string): TimetableEntry {
  const row = db.get<EntryRow>(`SELECT ${COLUMNS} FROM timetable_entries WHERE id = ?`, [id])
  if (!row) {
    throw new Error('Class not found')
  }
  return toEntry(row)
}

/** Adds the class once per selected day. Everything is validated first, so it's all or nothing. */
export function createTimetableEntries(
  db: AppDatabase,
  input: TimetableCreateInput
): TimetableEntry[] {
  const title = cleanTitle(input.title)
  const description = cleanDescription(input.description)
  const days = [...new Set((input.days ?? []).map(cleanDay))]
  if (days.length === 0) {
    throw new Error('Pick at least one day')
  }
  const [start, end] = cleanTimes(input.startTime, input.endTime)
  const color: EventColorId = isEventColor(input.color) ? input.color : DEFAULT_EVENT_COLOR

  const now = new Date().toISOString()
  const ids = days.map((day) => {
    const id = randomUUID()
    db.run(
      `INSERT INTO timetable_entries
         (id, day_of_week, start_minutes, end_minutes, title, description, color, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, day, start, end, title, description, color, now]
    )
    return id
  })
  return ids.map((id) => getTimetableEntry(db, id))
}

export function updateTimetableEntry(db: AppDatabase, input: TimetableUpdateInput): TimetableEntry {
  const current = getTimetableEntry(db, input.id)
  const title = input.title === undefined ? current.title : cleanTitle(input.title)
  const description =
    input.description === undefined ? current.description : cleanDescription(input.description)
  const day = cleanDay(input.dayOfWeek ?? current.dayOfWeek)
  const [start, end] = cleanTimes(
    input.startTime ?? current.startTime,
    input.endTime ?? current.endTime
  )
  const color: EventColorId = isEventColor(input.color) ? input.color : current.color

  db.run(
    `UPDATE timetable_entries
     SET day_of_week = ?, start_minutes = ?, end_minutes = ?, title = ?, description = ?,
         color = ?, updated_at = ?
     WHERE id = ?`,
    [day, start, end, title, description, color, new Date().toISOString(), input.id]
  )
  return getTimetableEntry(db, input.id)
}

export function deleteTimetableEntry(db: AppDatabase, id: string): void {
  getTimetableEntry(db, id)
  db.run('DELETE FROM timetable_entries WHERE id = ?', [id])
}
