import { describe, expect, it } from 'vitest'
import { daysBetween, describeDaysUntil, isReminderDue } from './reminders'

const event = (
  startDate: string,
  reminderEnabled = true
): { startDate: string; reminderEnabled: boolean } => ({
  startDate,
  reminderEnabled
})

describe('isReminderDue', () => {
  it('2-day lead: event in 2 days is due, in 3 days is not', () => {
    expect(isReminderDue(event('2026-10-10'), '2026-10-08', 2, false)).toBe(true)
    expect(isReminderDue(event('2026-10-11'), '2026-10-08', 2, false)).toBe(false)
  })

  it('1-day lead: event tomorrow is due, in 2 days is not', () => {
    expect(isReminderDue(event('2026-10-09'), '2026-10-08', 1, false)).toBe(true)
    expect(isReminderDue(event('2026-10-10'), '2026-10-08', 1, false)).toBe(false)
  })

  it('is due on the day of the event itself', () => {
    expect(isReminderDue(event('2026-10-08'), '2026-10-08', 1, false)).toBe(true)
  })

  it('is not due for past events', () => {
    expect(isReminderDue(event('2026-10-07'), '2026-10-08', 2, false)).toBe(false)
  })

  it('is not due when the reminder is off or already dismissed today', () => {
    expect(isReminderDue(event('2026-10-09', false), '2026-10-08', 1, false)).toBe(false)
    expect(isReminderDue(event('2026-10-09'), '2026-10-08', 1, true)).toBe(false)
  })

  it('counts days correctly across month and year ends', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)
    expect(isReminderDue(event('2027-01-01'), '2026-12-30', 2, false)).toBe(true)
  })
})

describe('describeDaysUntil', () => {
  it('words the countdown', () => {
    expect(describeDaysUntil(0)).toBe('today')
    expect(describeDaysUntil(1)).toBe('tomorrow')
    expect(describeDaysUntil(2)).toBe('in 2 days')
  })
})
