import type { CalendarEvent } from './api'
import { daysBetween } from './dates'

export { daysBetween }

/**
 * A reminder is due when it is switched on, today falls inside the lead window
 * (event date minus lead days, up to and including the event date), and the user
 * has not already dismissed it today.
 */
export function isReminderDue(
  event: Pick<CalendarEvent, 'startDate' | 'reminderEnabled'>,
  today: string,
  leadDays: number,
  dismissedToday: boolean
): boolean {
  if (!event.reminderEnabled || dismissedToday) {
    return false
  }
  const daysUntil = daysBetween(today, event.startDate)
  return daysUntil >= 0 && daysUntil <= leadDays
}

/** "today", "tomorrow", "in 2 days" — used by the reminder popup. */
export function describeDaysUntil(daysUntil: number): string {
  if (daysUntil <= 0) return 'today'
  if (daysUntil === 1) return 'tomorrow'
  return `in ${daysUntil} days`
}
