import type { CalendarEvent, Todo } from '@shared/api'
import { addDays } from '@shared/dates'
import type { EventColorId } from '@shared/eventColors'

export type UpcomingItem = {
  key: string
  kind: 'event' | 'todo'
  title: string
  /** `HH:MM`, or a short label like "All day" / "Ongoing". Null for to-dos. */
  when: string | null
  color: EventColorId | null
}

export type UpcomingDay = { date: string; items: UpcomingItem[] }

/**
 * The next `days` days (starting today) with the events that touch each day and the
 * unfinished to-dos due on it. A to-do an event created is shown as that event only.
 */
export function buildUpcoming(
  events: CalendarEvent[],
  todos: Todo[],
  today: string,
  days = 7
): UpcomingDay[] {
  const linked = new Set(events.map((event) => event.todoId).filter((id) => id !== null))
  return Array.from({ length: days }, (_, offset) => {
    const date = addDays(today, offset)
    const items: UpcomingItem[] = []

    const dayEvents = events
      .filter((event) => event.startDate <= date && date <= event.endDate)
      .map((event) => {
        const timed = !event.allDay && event.startTime !== null
        const startsToday = event.startDate === date
        // Sort key: all-day first, then by start time; a timed event carried over from an earlier day is "Ongoing".
        const sortKey = timed && startsToday ? (event.startTime as string) : ''
        const when = !timed ? 'All day' : startsToday ? (event.startTime as string) : 'Ongoing'
        return { sortKey, item: eventItem(event, when) }
      })
      .sort(
        (a, b) => a.sortKey.localeCompare(b.sortKey) || a.item.title.localeCompare(b.item.title)
      )
    items.push(...dayEvents.map((entry) => entry.item))

    for (const todo of todos) {
      if (!todo.done && todo.dueDate === date && !linked.has(todo.id)) {
        items.push({
          key: `todo-${todo.id}`,
          kind: 'todo',
          title: todo.text,
          when: null,
          color: null
        })
      }
    }
    return { date, items }
  })
}

function eventItem(event: CalendarEvent, when: string): UpcomingItem {
  return { key: `event-${event.id}`, kind: 'event', title: event.title, when, color: event.color }
}

/** "Today", "Tomorrow", otherwise "Sat 10 Oct". */
export function dayLabel(date: string, today: string): string {
  if (date === today) {
    return 'Today'
  }
  if (date === addDays(today, 1)) {
    return 'Tomorrow'
  }
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}
