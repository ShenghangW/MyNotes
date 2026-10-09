// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type AppDatabase } from './database'
import { createTodo, deleteTodo, listTodos, updateTodo } from './todosRepository'
import {
  createEvent,
  deleteEvent,
  dismissReminder,
  getEvent,
  listDueReminders,
  listEvents,
  updateEvent
} from './eventsRepository'

describe('events', () => {
  let dir: string
  let db: AppDatabase

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'mynote-events-'))
    db = await openDatabase(dir)
  })

  afterEach(() => {
    db.close()
  })

  it('creates events with a trimmed title and lists them by date', () => {
    const later = createEvent(db, { title: 'Exam', startDate: '2026-11-01' })
    const sooner = createEvent(db, {
      title: '  Essay due ',
      startDate: '2026-10-20',
      reminderEnabled: true
    })
    expect(sooner.title).toBe('Essay due')
    expect(sooner.reminderEnabled).toBe(true)
    expect(later.reminderEnabled).toBe(false)
    expect(listEvents(db).map((e) => e.id)).toEqual([sooner.id, later.id])
  })

  it('rejects empty titles and invalid or missing dates', () => {
    expect(() => createEvent(db, { title: '  ', startDate: '2026-10-20' })).toThrow('empty')
    expect(() => createEvent(db, { title: 'x'.repeat(201), startDate: '2026-10-20' })).toThrow(
      '200'
    )
    expect(() => createEvent(db, { title: 'x', startDate: '2026-02-30' })).toThrow('valid date')
    expect(() => createEvent(db, { title: 'x', startDate: '' })).toThrow('required')
    expect(() =>
      createEvent(db, {
        title: 'x',
        startDate: '2026-10-20',
        allDay: false,
        startTime: '25:00',
        endTime: '26:00'
      })
    ).toThrow('24-hour')
  })

  it('updates and deletes, and events survive close and reopen', async () => {
    const event = createEvent(db, { title: 'Quiz', startDate: '2026-10-20' })
    const updated = updateEvent(db, { id: event.id, title: 'Big quiz', reminderEnabled: true })
    expect(updated.title).toBe('Big quiz')
    expect(updated.startDate).toBe('2026-10-20')
    expect(() => updateEvent(db, { id: 'missing', title: 'x' })).toThrow('not found')

    db.close()
    db = await openDatabase(dir)
    expect(getEvent(db, event.id).title).toBe('Big quiz')

    deleteEvent(db, event.id)
    expect(listEvents(db)).toEqual([])
    expect(() => deleteEvent(db, event.id)).toThrow('not found')
  })

  it('lists due reminders using the saved lead time', () => {
    const tomorrow = createEvent(db, {
      title: 'Tomorrow',
      startDate: '2026-10-09',
      reminderEnabled: true
    })
    const inTwo = createEvent(db, {
      title: 'In two',
      startDate: '2026-10-10',
      reminderEnabled: true
    })
    createEvent(db, { title: 'No reminder', startDate: '2026-10-09' })
    createEvent(db, { title: 'Yesterday', startDate: '2026-10-07', reminderEnabled: true })

    // Default lead time is 1 day.
    expect(listDueReminders(db, '2026-10-08').map((r) => r.event.id)).toEqual([tomorrow.id])

    db.updateSettings({ reminderLeadDays: 2 })
    const due = listDueReminders(db, '2026-10-08')
    expect(due.map((r) => [r.event.id, r.daysUntil])).toEqual([
      [tomorrow.id, 1],
      [inTwo.id, 2]
    ])
  })

  it('dismissing hides a reminder for that day only, and it persists', async () => {
    const event = createEvent(db, {
      title: 'Tomorrow',
      startDate: '2026-10-09',
      reminderEnabled: true
    })
    dismissReminder(db, event.id, '2026-10-08')
    expect(listDueReminders(db, '2026-10-08')).toEqual([])

    db.close()
    db = await openDatabase(dir)
    expect(listDueReminders(db, '2026-10-08')).toEqual([])
    // Next day it is due again (event is now today).
    expect(listDueReminders(db, '2026-10-09').map((r) => r.event.id)).toEqual([event.id])
  })

  it('moving an event clears its dismissal so it can remind again', () => {
    const event = createEvent(db, {
      title: 'Tomorrow',
      startDate: '2026-10-09',
      reminderEnabled: true
    })
    dismissReminder(db, event.id, '2026-10-08')
    updateEvent(db, { id: event.id, startDate: '2026-10-08' })
    expect(listDueReminders(db, '2026-10-08').map((r) => r.event.id)).toEqual([event.id])
  })
  it('stores timed, multi-day events and returns them in 24-hour form', () => {
    const trip = createEvent(db, {
      title: 'Camp',
      startDate: '2026-10-20',
      startTime: '09:30',
      endDate: '2026-12-05',
      endTime: '17:00',
      allDay: false,
      color: 'green'
    })
    expect(trip).toMatchObject({
      startDate: '2026-10-20',
      startTime: '09:30',
      endDate: '2026-12-05',
      endTime: '17:00',
      allDay: false,
      color: 'green'
    })
  })

  it('all-day events default the end to the start date and drop times', () => {
    const day = createEvent(db, { title: 'Holiday', startDate: '2026-10-20' })
    expect(day).toMatchObject({
      endDate: '2026-10-20',
      allDay: true,
      startTime: null,
      endTime: null
    })
    const span = createEvent(db, {
      title: 'Exams',
      startDate: '2026-10-20',
      endDate: '2026-10-27',
      allDay: true,
      startTime: '10:00',
      endTime: '11:00'
    })
    expect(span.startTime).toBeNull()
    expect(span.endDate).toBe('2026-10-27')
  })

  it('rejects an end that is not after the start', () => {
    const timed = { title: 'x', startDate: '2026-10-20', allDay: false }
    expect(() => createEvent(db, { ...timed, startTime: '10:00', endTime: '10:00' })).toThrow(
      'End must be after'
    )
    expect(() => createEvent(db, { ...timed, startTime: '10:00', endTime: '09:00' })).toThrow(
      'End must be after'
    )
    expect(() =>
      createEvent(db, { title: 'x', startDate: '2026-10-20', endDate: '2026-10-19', allDay: true })
    ).toThrow('before the start')
    expect(() => createEvent(db, { ...timed, startTime: '10:00' })).toThrow('End time is required')
  })

  it('allows overlapping events and auto-assigns a default colour', () => {
    const a = createEvent(db, {
      title: 'A',
      startDate: '2026-10-20',
      startTime: '10:00',
      endTime: '12:00',
      allDay: false
    })
    const b = createEvent(db, {
      title: 'B',
      startDate: '2026-10-20',
      startTime: '11:00',
      endTime: '13:00',
      allDay: false
    })
    expect(listEvents(db).map((e) => e.id)).toEqual([a.id, b.id])
    expect(a.color).toBe('blue')
  })

  it('switching an event between all-day and timed works through update', () => {
    const e = createEvent(db, { title: 'Flex', startDate: '2026-10-20' })
    const timed = updateEvent(db, { id: e.id, allDay: false, startTime: '08:00', endTime: '09:15' })
    expect(timed).toMatchObject({ allDay: false, startTime: '08:00', endTime: '09:15' })
    const back = updateEvent(db, { id: e.id, allDay: true })
    expect(back).toMatchObject({ allDay: true, startTime: null, endTime: null })
    expect(() => updateEvent(db, { id: e.id, allDay: false })).toThrow('required')
  })

  it('does NOT create a to-do unless asked', () => {
    createEvent(db, { title: 'Just an event', startDate: '2026-10-20' })
    expect(listTodos(db)).toEqual([])
  })

  it('creates a linked to-do when asked, and keeps it in step with the event', () => {
    const e = createEvent(db, { title: 'Hand in essay', startDate: '2026-10-20', addToTodo: true })
    expect(e.todoId).not.toBeNull()
    expect(listTodos(db).map((t) => [t.text, t.dueDate])).toEqual([['Hand in essay', '2026-10-20']])

    updateEvent(db, { id: e.id, title: 'Essay v2', startDate: '2026-10-22' })
    expect(listTodos(db).map((t) => [t.text, t.dueDate])).toEqual([['Essay v2', '2026-10-22']])
    expect(listTodos(db)).toHaveLength(1)
  })

  it('can add the to-do later, remove it, and deleting the event removes its to-do', () => {
    const e = createEvent(db, { title: 'Quiz', startDate: '2026-10-20' })
    expect(updateEvent(db, { id: e.id, addToTodo: true }).todoId).not.toBeNull()
    expect(listTodos(db)).toHaveLength(1)

    expect(updateEvent(db, { id: e.id, addToTodo: false }).todoId).toBeNull()
    expect(listTodos(db)).toEqual([])

    updateEvent(db, { id: e.id, addToTodo: true })
    deleteEvent(db, e.id)
    expect(listTodos(db)).toEqual([])
  })

  it('deleting the linked to-do unlinks the event but keeps it', () => {
    const e = createEvent(db, { title: 'Quiz', startDate: '2026-10-20', addToTodo: true })
    deleteTodo(db, listTodos(db)[0].id)
    expect(getEvent(db, e.id).todoId).toBeNull()
    // Saving again must not resurrect or crash.
    expect(updateEvent(db, { id: e.id, title: 'Quiz 2' }).todoId).toBeNull()
    expect(listTodos(db)).toEqual([])
  })

  it('checking off the linked to-do does not change the event', () => {
    const e = createEvent(db, { title: 'Quiz', startDate: '2026-10-20', addToTodo: true })
    updateTodo(db, { id: listTodos(db)[0].id, done: true })
    expect(getEvent(db, e.id).title).toBe('Quiz')
    expect(createTodo(db, { text: 'other' }).done).toBe(false)
  })
})
