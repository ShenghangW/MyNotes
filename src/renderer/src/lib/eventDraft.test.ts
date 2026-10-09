import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '@shared/api'
import {
  draftFromEvent,
  draftToInput,
  moveStart,
  newDraft,
  scheduleError,
  setAllDay
} from './eventDraft'

describe('newDraft', () => {
  it('starts at the next full hour and lasts one hour', () => {
    const draft = newDraft({ color: 'blue', now: new Date(2026, 9, 8, 14, 20) })
    expect(draft).toMatchObject({
      startDate: '2026-10-08',
      startTime: '15:00',
      endDate: '2026-10-08',
      endTime: '16:00',
      allDay: false,
      addToTodo: false,
      reminderEnabled: false
    })
  })

  it('rolls over midnight', () => {
    const draft = newDraft({ color: 'red', now: new Date(2026, 9, 8, 23, 40) })
    expect(draft).toMatchObject({ startDate: '2026-10-09', startTime: '00:00', endTime: '01:00' })
  })

  it('uses a clicked day and slot', () => {
    const draft = newDraft({ color: 'green', startDate: '2026-11-02', startTime: '13:30' })
    expect(draft).toMatchObject({ startDate: '2026-11-02', startTime: '13:30', endTime: '14:30' })
  })
})

describe('scheduleError / moveStart / setAllDay', () => {
  const base = newDraft({ color: 'blue', startDate: '2026-10-08', startTime: '10:00' })

  it('flags an end that is not after the start', () => {
    expect(scheduleError(base)).toBeNull()
    expect(scheduleError({ ...base, endTime: '10:00' })).toContain('End must be after')
    expect(scheduleError({ ...base, allDay: true, endDate: '2026-10-07' })).toContain('before')
  })

  it('moving the start keeps the length, including across days', () => {
    const moved = moveStart(base, { startTime: '14:30' })
    expect(moved).toMatchObject({ startTime: '14:30', endTime: '15:30', endDate: '2026-10-08' })
    const nextDay = moveStart(base, { startDate: '2026-10-09', startTime: '23:30' })
    expect(nextDay).toMatchObject({ endDate: '2026-10-10', endTime: '00:30' })
  })

  it('moving the start of a multi-day all-day event keeps its span', () => {
    const span = { ...base, allDay: true, endDate: '2026-10-12' }
    expect(moveStart(span, { startDate: '2026-11-01' }).endDate).toBe('2026-11-05')
  })

  it('turning All-day off repairs an invalid time range', () => {
    const allDay = { ...base, allDay: true, endTime: '09:00' }
    expect(setAllDay(allDay, false)).toMatchObject({ allDay: false, endTime: '11:00' })
  })
})

describe('draft <-> event', () => {
  const event: CalendarEvent = {
    id: 'e',
    title: 'Camp',
    startDate: '2026-10-20',
    startTime: null,
    endDate: '2026-11-03',
    endTime: null,
    allDay: true,
    color: 'teal',
    reminderEnabled: true,
    todoId: 'abc',
    createdAt: '',
    updatedAt: ''
  }

  it('loads an all-day event with sensible default times and the to-do toggle on', () => {
    const draft = draftFromEvent(event)
    expect(draft).toMatchObject({
      allDay: true,
      startTime: '09:00',
      endTime: '10:00',
      addToTodo: true
    })
  })

  it('sends null times for all-day events and real times for timed ones', () => {
    expect(draftToInput(draftFromEvent(event))).toMatchObject({
      startTime: null,
      endTime: null,
      allDay: true
    })
    const timed = { ...draftFromEvent(event), allDay: false }
    expect(draftToInput(timed)).toMatchObject({
      startTime: '09:00',
      endTime: '10:00',
      allDay: false
    })
  })
})
