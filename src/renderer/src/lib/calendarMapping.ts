import type { EventInput } from '@fullcalendar/core'
import type { CalendarEvent, EventUpdateInput, Todo } from '@shared/api'
import { addDays } from '@shared/dates'
import { eventColorHex } from '@shared/eventColors'
import { toLocalIsoDate, toLocalTime } from './date'

/** FullCalendar treats an all-day end as exclusive, so a one-day event ends the next day. */
export function toFcEvent(event: CalendarEvent): EventInput {
  const hex = eventColorHex(event.color)
  return {
    id: event.id,
    title: event.title,
    allDay: event.allDay,
    start: event.allDay ? event.startDate : `${event.startDate}T${event.startTime}`,
    end: event.allDay ? addDays(event.endDate, 1) : `${event.endDate}T${event.endTime}`,
    backgroundColor: hex,
    borderColor: hex,
    textColor: '#ffffff',
    extendedProps: { kind: 'event' }
  }
}

export function toFcTodo(todo: Todo): EventInput {
  return {
    id: `todo-${todo.id}`,
    title: `${todo.done ? '☑' : '☐'} ${todo.text}`,
    allDay: true,
    start: todo.dueDate as string,
    editable: false,
    classNames: todo.done ? ['mn-todo', 'mn-todo-done'] : ['mn-todo'],
    extendedProps: { kind: 'todo', date: todo.dueDate }
  }
}

type ScheduleFields = Required<
  Pick<EventUpdateInput, 'startDate' | 'endDate' | 'startTime' | 'endTime' | 'allDay'>
>

/** Turns a FullCalendar range (selection, drag or resize) back into our schedule fields. */
export function scheduleFromFc(start: Date, end: Date | null, allDay: boolean): ScheduleFields {
  const startDate = toLocalIsoDate(start)
  if (allDay) {
    const lastDay = end ? addDays(toLocalIsoDate(end), -1) : startDate
    return {
      startDate,
      endDate: lastDay < startDate ? startDate : lastDay,
      startTime: null,
      endTime: null,
      allDay: true
    }
  }
  // A timed event dragged out of the all-day row has no end yet: give it an hour.
  const finish =
    end && end.getTime() > start.getTime() ? end : new Date(start.getTime() + 3_600_000)
  return {
    startDate,
    endDate: toLocalIsoDate(finish),
    startTime: toLocalTime(start),
    endTime: toLocalTime(finish),
    allDay: false
  }
}
