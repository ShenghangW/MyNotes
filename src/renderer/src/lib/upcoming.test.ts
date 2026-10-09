import { describe, expect, it } from 'vitest'
import type { CalendarEvent, Todo } from '@shared/api'
import { buildUpcoming, dayLabel } from './upcoming'

function event(id: string, title: string, extra: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id,
    title,
    startDate: '2026-10-09',
    startTime: '10:00',
    endDate: '2026-10-09',
    endTime: '11:00',
    allDay: false,
    color: 'blue',
    reminderEnabled: false,
    todoId: null,
    createdAt: '',
    updatedAt: '',
    ...extra
  }
}

function todo(id: string, text: string, extra: Partial<Todo> = {}): Todo {
  return {
    id,
    text,
    done: false,
    dueDate: '2026-10-09',
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
    ...extra
  }
}

describe('buildUpcoming', () => {
  it('covers seven days starting today', () => {
    const days = buildUpcoming([], [], '2026-10-09')
    expect(days.map((day) => day.date)).toEqual([
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15'
    ])
    expect(days.every((day) => day.items.length === 0)).toBe(true)
  })

  it('lists events and unfinished to-dos on their day, all-day first then by time', () => {
    const days = buildUpcoming(
      [
        event('late', 'Late', { startTime: '15:00', endTime: '16:00' }),
        event('early', 'Early', { startTime: '08:30', endTime: '09:00' }),
        event('all', 'Holiday', { allDay: true, startTime: null, endTime: null })
      ],
      [todo('t1', 'Hand in essay'), todo('t2', 'Done already', { done: true })],
      '2026-10-09'
    )
    expect(days[0].items.map((item) => [item.title, item.when])).toEqual([
      ['Holiday', 'All day'],
      ['Early', '08:30'],
      ['Late', '15:00'],
      ['Hand in essay', null]
    ])
  })

  it('shows a multi-day event on every day it covers', () => {
    const days = buildUpcoming(
      [event('camp', 'Camp', { endDate: '2026-10-11', endTime: '12:00' })],
      [],
      '2026-10-09'
    )
    expect(days.slice(0, 4).map((day) => day.items.map((item) => item.when))).toEqual([
      ['10:00'],
      ['Ongoing'],
      ['Ongoing'],
      []
    ])
  })

  it('ignores items outside the week and shows a to-do an event created only as the event', () => {
    const days = buildUpcoming(
      [
        event('e1', 'Exam', { todoId: 't1' }),
        event('old', 'Past', { startDate: '2026-10-01', endDate: '2026-10-01' })
      ],
      [todo('t1', 'Exam'), todo('far', 'Next month', { dueDate: '2026-11-20' })],
      '2026-10-09'
    )
    const titles = days.flatMap((day) => day.items.map((item) => item.title))
    expect(titles).toEqual(['Exam'])
  })
})

describe('dayLabel', () => {
  it('says Today and Tomorrow, then a short date', () => {
    expect(dayLabel('2026-10-09', '2026-10-09')).toBe('Today')
    expect(dayLabel('2026-10-10', '2026-10-09')).toBe('Tomorrow')
    expect(dayLabel('2026-10-12', '2026-10-09')).toMatch(/12/)
  })
})
