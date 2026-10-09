import { describe, expect, it } from 'vitest'
import type { TimetableEntry } from '@shared/api'
import {
  blockPosition,
  draftToCreate,
  draftToUpdate,
  gridRange,
  layoutDay,
  HOUR_PX,
  moveStart,
  newTimetableDraft,
  timeError,
  timeFromOffset,
  weekdayIndex
} from './timetable'

function entry(startTime: string, endTime: string, id = 'x'): TimetableEntry {
  return {
    id,
    dayOfWeek: 0,
    startTime,
    endTime,
    title: 'Class',
    description: null,
    color: 'blue',
    updatedAt: ''
  }
}

describe('timetable helpers', () => {
  it('numbers weekdays from Monday', () => {
    expect(weekdayIndex(new Date(2026, 9, 5))).toBe(0) // Mon 5 Oct 2026
    expect(weekdayIndex(new Date(2026, 9, 9))).toBe(4) // Fri
    expect(weekdayIndex(new Date(2026, 9, 11))).toBe(6) // Sun
  })

  it('shows 08:00-18:00 by default and widens to fit early or late classes', () => {
    expect(gridRange([])).toEqual({ firstHour: 8, lastHour: 18 })
    expect(gridRange([entry('09:00', '10:00')])).toEqual({ firstHour: 8, lastHour: 18 })
    expect(gridRange([entry('07:30', '09:00'), entry('17:00', '20:15')])).toEqual({
      firstHour: 7,
      lastHour: 21
    })
  })

  it('positions a class by its start and length', () => {
    expect(blockPosition(entry('12:30', '14:30'), 8)).toEqual({
      top: 4.5 * HOUR_PX,
      height: 2 * HOUR_PX
    })
  })

  it('turns a click position into a half-hour start time', () => {
    expect(timeFromOffset(0, 8)).toBe('08:00')
    expect(timeFromOffset(HOUR_PX * 1.4, 8)).toBe('09:00')
    expect(timeFromOffset(HOUR_PX * 1.6, 8)).toBe('09:30')
    expect(timeFromOffset(-20, 8)).toBe('08:00')
    expect(timeFromOffset(HOUR_PX * 40, 8)).toBe('23:55')
  })

  it('new drafts last an hour; moving the start keeps the length', () => {
    const draft = newTimetableDraft({ color: 'red', day: 2, startTime: '13:00' })
    expect(draft).toMatchObject({ days: [2], startTime: '13:00', endTime: '14:00', color: 'red' })

    const longer = { ...draft, endTime: '15:30' }
    expect(moveStart(longer, '09:00')).toMatchObject({ startTime: '09:00', endTime: '11:30' })
    expect(newTimetableDraft({ color: 'red' }).days).toEqual([])
  })

  it('flags an end that is not after the start', () => {
    const draft = newTimetableDraft({ color: 'blue', day: 0 })
    expect(timeError(draft)).toBeNull()
    expect(timeError({ ...draft, endTime: draft.startTime })).toContain('after')
  })

  it('builds create and update payloads', () => {
    const draft = { ...newTimetableDraft({ color: 'teal', day: 1 }), title: 'Maths' }
    expect(draftToCreate(draft)).toEqual({
      title: 'Maths',
      days: [1],
      startTime: '09:00',
      endTime: '10:00',
      description: '',
      color: 'teal'
    })
    expect(draftToUpdate('id1', draft)).toMatchObject({ id: 'id1', dayOfWeek: 1, title: 'Maths' })
  })

  it('lays overlapping classes side by side and leaves the rest full width', () => {
    const layout = layoutDay([
      entry('09:00', '10:00', 'solo'),
      entry('12:00', '14:00', 'a'),
      entry('13:00', '15:00', 'b'),
      entry('14:00', '15:00', 'c'), // fits back under a's lane
      entry('15:00', '16:00', 'after') // starts when the cluster ends
    ])
    expect(layout.get('solo')).toEqual({ lane: 0, lanes: 1 })
    expect(layout.get('a')).toEqual({ lane: 0, lanes: 2 })
    expect(layout.get('b')).toEqual({ lane: 1, lanes: 2 })
    expect(layout.get('c')).toEqual({ lane: 0, lanes: 2 })
    expect(layout.get('after')).toEqual({ lane: 0, lanes: 1 })
  })
})
