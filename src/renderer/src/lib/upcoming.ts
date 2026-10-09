import type { CalendarEvent } from '@shared/api'
import { addDays, daysBetween } from '@shared/dates'
import { formatDueDate } from './date'

/**
 * Every event that hasn't finished yet (today onwards, including ones already under way),
 * soonest first. All-day events come before timed ones on the same day.
 */
export function listUpcomingEvents(events: CalendarEvent[], today: string): CalendarEvent[] {
  return events
    .filter((event) => event.endDate >= today)
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) ||
        (a.allDay ? '' : (a.startTime ?? '')).localeCompare(b.allDay ? '' : (b.startTime ?? '')) ||
        a.title.localeCompare(b.title)
    )
}

export type UpcomingDescription = {
  /** "Today", "Tomorrow", "In 3 days" or "Ongoing". */
  label: string
  /** "10/10/2026" or "10/10/2026 – 12/10/2026". */
  dates: string
  /** "All day" or "09:30–11:00". */
  time: string
}

export function describeUpcoming(event: CalendarEvent, today: string): UpcomingDescription {
  let label: string
  if (event.startDate < today) {
    label = 'Ongoing'
  } else if (event.startDate === today) {
    label = 'Today'
  } else if (event.startDate === addDays(today, 1)) {
    label = 'Tomorrow'
  } else {
    label = `In ${daysBetween(today, event.startDate)} days`
  }
  const dates =
    event.startDate === event.endDate
      ? formatDueDate(event.startDate)
      : `${formatDueDate(event.startDate)} – ${formatDueDate(event.endDate)}`
  const time =
    event.allDay || !event.startTime || !event.endTime
      ? 'All day'
      : `${event.startTime}–${event.endTime}`
  return { label, dates, time }
}
