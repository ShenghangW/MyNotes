import { randomUUID } from 'node:crypto'
import type { SqlValue } from 'sql.js'
import type {
  CalendarEvent,
  DueReminder,
  EventCreateInput,
  EventUpdateInput
} from '../../shared/api'
import {
  addDays,
  daysBetween,
  isValidIsoDate,
  isValidTime,
  minutesBetween
} from '../../shared/dates'
import { DEFAULT_EVENT_COLOR, isEventColor, type EventColorId } from '../../shared/eventColors'
import { isReminderDue } from '../../shared/reminders'
import type { AppDatabase } from './database'
import { createTodo, deleteTodo, updateTodo } from './todosRepository'

type EventRow = Record<string, SqlValue>

const COLUMNS =
  'id, title, event_date, end_date, start_time, end_time, all_day, color, reminder_enabled, todo_id, created_at, updated_at'
const MAX_TITLE_LENGTH = 200

function toEvent(row: EventRow): CalendarEvent {
  const startDate = String(row.event_date)
  const allDay = Number(row.all_day) === 1
  return {
    id: String(row.id),
    title: String(row.title),
    startDate,
    startTime: !allDay && typeof row.start_time === 'string' ? row.start_time : null,
    endDate: typeof row.end_date === 'string' ? row.end_date : startDate,
    endTime: !allDay && typeof row.end_time === 'string' ? row.end_time : null,
    allDay,
    color: isEventColor(row.color) ? row.color : DEFAULT_EVENT_COLOR,
    reminderEnabled: Number(row.reminder_enabled) === 1,
    todoId: typeof row.todo_id === 'string' ? row.todo_id : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

function cleanTitle(title: string | undefined): string {
  const trimmed = (title ?? '').trim()
  if (trimmed === '') {
    throw new Error('Event title cannot be empty')
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new Error(`Event title must be ${MAX_TITLE_LENGTH} characters or fewer`)
  }
  return trimmed
}

function requireDate(value: string | null | undefined, what: string): string {
  if (!value) {
    throw new Error(`${what} is required`)
  }
  if (!isValidIsoDate(value)) {
    throw new Error(`${what} must be a valid date (YYYY-MM-DD)`)
  }
  return value
}

function requireTime(value: string | null | undefined, what: string): string {
  if (!value) {
    throw new Error(`${what} is required`)
  }
  if (!isValidTime(value)) {
    throw new Error(`${what} must be a 24-hour time (HH:MM)`)
  }
  return value
}

type Schedule = {
  startDate: string
  endDate: string
  startTime: string | null
  endTime: string | null
  allDay: boolean
}

/** Validates a full schedule. All-day events ignore times; timed events must end after they start. */
export function cleanSchedule(input: {
  startDate?: string | null
  endDate?: string | null
  startTime?: string | null
  endTime?: string | null
  allDay?: boolean
}): Schedule {
  const startDate = requireDate(input.startDate, 'Start date')
  const endDate = input.endDate ? requireDate(input.endDate, 'End date') : startDate
  const allDay = input.allDay ?? !input.startTime

  if (allDay) {
    if (endDate < startDate) {
      throw new Error('End date cannot be before the start date')
    }
    return { startDate, endDate, startTime: null, endTime: null, allDay: true }
  }

  const startTime = requireTime(input.startTime, 'Start time')
  const endTime = requireTime(input.endTime, 'End time')
  if (minutesBetween(startDate, startTime, endDate, endTime) <= 0) {
    throw new Error('End must be after the start')
  }
  return { startDate, endDate, startTime, endTime, allDay: false }
}

export function listEvents(db: AppDatabase): CalendarEvent[] {
  return db
    .all<EventRow>(
      `SELECT ${COLUMNS} FROM events ORDER BY event_date ASC, start_time ASC, created_at ASC`
    )
    .map(toEvent)
}

export function getEvent(db: AppDatabase, id: string): CalendarEvent {
  const row = db.get<EventRow>(`SELECT ${COLUMNS} FROM events WHERE id = ?`, [id])
  if (!row) {
    throw new Error('Event not found')
  }
  return toEvent(row)
}

function linkedTodoId(db: AppDatabase, eventId: string): string | null {
  const row = db.get<EventRow>(
    'SELECT todo_id FROM events WHERE id = ? AND todo_id IN (SELECT id FROM todos)',
    [eventId]
  )
  return row && typeof row.todo_id === 'string' ? row.todo_id : null
}

export function createEvent(db: AppDatabase, input: EventCreateInput): CalendarEvent {
  const title = cleanTitle(input.title)
  const schedule = cleanSchedule(input)
  const color: EventColorId = isEventColor(input.color) ? input.color : DEFAULT_EVENT_COLOR
  const todoId = input.addToTodo
    ? createTodo(db, { text: title, dueDate: schedule.startDate }).id
    : null
  const id = randomUUID()
  const now = new Date().toISOString()
  db.run(
    `INSERT INTO events (id, title, event_date, end_date, start_time, end_time, all_day, color,
                         reminder_enabled, todo_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      schedule.startDate,
      schedule.endDate,
      schedule.startTime,
      schedule.endTime,
      schedule.allDay ? 1 : 0,
      color,
      input.reminderEnabled ? 1 : 0,
      todoId,
      now,
      now
    ]
  )
  return getEvent(db, id)
}

export function updateEvent(db: AppDatabase, input: EventUpdateInput): CalendarEvent {
  const current = getEvent(db, input.id)
  const title = input.title === undefined ? current.title : cleanTitle(input.title)
  const startDate = input.startDate ?? current.startDate
  // Moving only the start keeps the event's length by shifting the end with it.
  const endDate =
    input.endDate ?? addDays(startDate, daysBetween(current.startDate, current.endDate))
  const schedule = cleanSchedule({
    startDate,
    endDate,
    startTime: input.startTime === undefined ? current.startTime : input.startTime,
    endTime: input.endTime === undefined ? current.endTime : input.endTime,
    allDay: input.allDay ?? current.allDay
  })
  const color: EventColorId = isEventColor(input.color) ? input.color : current.color
  const reminderEnabled = input.reminderEnabled ?? current.reminderEnabled

  // The to-do link: keep it in step with the event, or add/remove it when asked.
  const existingTodoId = linkedTodoId(db, input.id)
  const wantTodo = input.addToTodo ?? existingTodoId !== null
  let todoId: string | null = existingTodoId
  if (wantTodo) {
    if (existingTodoId) {
      updateTodo(db, { id: existingTodoId, text: title, dueDate: schedule.startDate })
    } else {
      todoId = createTodo(db, { text: title, dueDate: schedule.startDate }).id
    }
  } else if (existingTodoId) {
    deleteTodo(db, existingTodoId)
    todoId = null
  }

  db.run(
    `UPDATE events
     SET title = ?, event_date = ?, end_date = ?, start_time = ?, end_time = ?, all_day = ?,
         color = ?, reminder_enabled = ?, todo_id = ?, updated_at = ?
     WHERE id = ?`,
    [
      title,
      schedule.startDate,
      schedule.endDate,
      schedule.startTime,
      schedule.endTime,
      schedule.allDay ? 1 : 0,
      color,
      reminderEnabled ? 1 : 0,
      todoId,
      new Date().toISOString(),
      input.id
    ]
  )
  // Moving an event (or re-enabling its reminder) should be able to remind again today.
  if (schedule.startDate !== current.startDate || reminderEnabled !== current.reminderEnabled) {
    db.run('DELETE FROM reminder_dismissals WHERE event_id = ?', [input.id])
  }
  return getEvent(db, input.id)
}

/** Deleting an event also removes the to-do it created (if that still exists). */
export function deleteEvent(db: AppDatabase, id: string): void {
  getEvent(db, id)
  const todoId = linkedTodoId(db, id)
  db.run('DELETE FROM reminder_dismissals WHERE event_id = ?', [id])
  db.run('DELETE FROM events WHERE id = ?', [id])
  if (todoId) {
    deleteTodo(db, todoId)
  }
}

/** Events whose reminder should pop up on `today` (local YYYY-MM-DD), soonest first. */
export function listDueReminders(db: AppDatabase, today: string): DueReminder[] {
  const leadDays = db.getSettings().reminderLeadDays
  const dismissed = new Set(
    db
      .all<EventRow>('SELECT event_id FROM reminder_dismissals WHERE for_date = ?', [today])
      .map((row) => String(row.event_id))
  )
  return listEvents(db)
    .filter((event) => isReminderDue(event, today, leadDays, dismissed.has(event.id)))
    .map((event) => ({ event, daysUntil: daysBetween(today, event.startDate) }))
}

/** Hides one event's reminder for `today` only; it can pop up again tomorrow. */
export function dismissReminder(db: AppDatabase, eventId: string, today: string): void {
  getEvent(db, eventId)
  db.run(
    `INSERT OR REPLACE INTO reminder_dismissals (event_id, for_date, dismissed_at)
     VALUES (?, ?, ?)`,
    [eventId, today, new Date().toISOString()]
  )
}
