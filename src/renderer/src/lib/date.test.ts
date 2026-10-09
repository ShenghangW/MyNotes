import { describe, expect, it } from 'vitest'
import {
  formatDueDate,
  formatNumericDate,
  formatShortDate,
  isOverdue,
  toLocalIsoDate
} from './date'

describe('date helpers', () => {
  it('formats the local calendar date with zero padding', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(toLocalIsoDate(new Date(2026, 9, 8))).toBe('2026-10-08')
  })

  it('treats only dates before today as overdue', () => {
    expect(isOverdue('2026-10-07', '2026-10-08')).toBe(true)
    expect(isOverdue('2026-10-08', '2026-10-08')).toBe(false)
    expect(isOverdue('2026-10-09', '2026-10-08')).toBe(false)
    expect(isOverdue(null, '2026-10-08')).toBe(false)
  })

  it('writes dates as day/month/year numbers', () => {
    expect(formatDueDate('2026-10-09')).toBe('09/10/2026')
    expect(formatDueDate('2026-01-31')).toBe('31/01/2026')
    expect(formatDueDate('not a date')).toBe('not a date')
    expect(formatNumericDate(new Date(2026, 9, 10))).toBe('10/10/2026')
    expect(formatShortDate('nonsense')).toBe('')
    expect(formatShortDate(new Date(2026, 9, 10, 15, 30).toISOString())).toBe('10/10/2026')
  })
})
