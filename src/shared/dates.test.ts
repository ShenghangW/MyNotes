import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMinutes,
  daysBetween,
  isValidIsoDate,
  isValidTime,
  minutesBetween
} from './dates'

describe('dates', () => {
  it('validates dates and 24-hour times', () => {
    expect(isValidIsoDate('2028-02-29')).toBe(true)
    expect(isValidIsoDate('2026-02-29')).toBe(false)
    expect(isValidIsoDate('10/20/2026')).toBe(false)
    expect(isValidTime('00:00')).toBe(true)
    expect(isValidTime('23:59')).toBe(true)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('9:30')).toBe(false)
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(daysBetween('2026-10-08', '2026-12-08')).toBe(61)
  })

  it('measures and shifts date-times, including across midnight', () => {
    expect(minutesBetween('2026-10-08', '23:00', '2026-10-09', '01:30')).toBe(150)
    expect(minutesBetween('2026-10-08', '10:00', '2026-10-08', '09:00')).toBe(-60)
    expect(addMinutes('2026-10-08', '23:30', 60)).toEqual({ date: '2026-10-09', time: '00:30' })
  })
})
