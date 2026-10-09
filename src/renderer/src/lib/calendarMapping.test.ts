import { describe, expect, it } from 'vitest'
import type { CalendarEvent, Todo } from '@shared/api'
import { scheduleFromFc, toFcEvent, toFcTodo } from './calendarMapping'

const base: CalendarEvent = {
  id: 'e1',
  title: 'Thing',
  startDate: '2026-10-20',
  startTime: null,
  endDate: '2026-10-20',
  endTime: null,
  allDay: true,
  color: 'purple',
  reminderEnabled: false,
  todoId: null,
  createdAt: '',
  updatedAt: ''
}

describe('toFcEvent', () => {
  it('makes all-day ends exclusive so multi-day events span the right days', () => {
    expect(toFcEvent({ ...base, endDate: '2026-10-22' })).toMatchObject({
      allDay: true,
      start: '2026-10-20',
      end: '2026-10-23'
    })
  })

  it('keeps timed events (even across months) with their colour', () => {
    const fc = toFcEvent({
      ...base,
      allDay: false,
      startTime: '09:30',
      endDate: '2026-12-05',
      endTime: '17:00'
    })
    expect(fc).toMatchObject({ start: '2026-10-20T09:30', end: '2026-12-05T17:00' })
    expect(fc.backgroundColor).toMatch(/^#/)
  })
})

describe('toFcTodo', () => {
  it('is read-only and shows done state', () => {
    const todo: Todo = {
      id: 't',
      text: 'Essay',
      done: true,
      dueDate: '2026-10-20',
      sortOrder: 0,
      createdAt: '',
      updatedAt: ''
    }
    expect(toFcTodo(todo)).toMatchObject({ id: 'todo-t', title: '☑ Essay', editable: false })
  })
})

describe('scheduleFromFc', () => {
  it('converts a timed range', () => {
    expect(scheduleFromFc(new Date(2026, 9, 8, 9, 0), new Date(2026, 9, 8, 10, 30), false)).toEqual(
      {
        startDate: '2026-10-08',
        endDate: '2026-10-08',
        startTime: '09:00',
        endTime: '10:30',
        allDay: false
      }
    )
  })

  it('gives a timed event with no end one hour', () => {
    expect(scheduleFromFc(new Date(2026, 9, 8, 23, 30), null, false)).toMatchObject({
      endDate: '2026-10-09',
      endTime: '00:30'
    })
  })

  it('converts an all-day range back from an exclusive end', () => {
    expect(scheduleFromFc(new Date(2026, 9, 20), new Date(2026, 9, 23), true)).toEqual({
      startDate: '2026-10-20',
      endDate: '2026-10-22',
      startTime: null,
      endTime: null,
      allDay: true
    })
    expect(scheduleFromFc(new Date(2026, 9, 20), null, true).endDate).toBe('2026-10-20')
  })
})
