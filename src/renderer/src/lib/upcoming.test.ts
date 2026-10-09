import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '@shared/api'
import { describeUpcoming, listUpcomingEvents } from './upcoming'

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

const TODAY = '2026-10-09'

describe('listUpcomingEvents', () => {
  it('keeps every event that has not finished, however far away', () => {
    const list = listUpcomingEvents(
      [
        event('far', 'Far away', { startDate: '2027-06-01', endDate: '2027-06-01' }),
        event('now', 'Today'),
        event('past', 'Finished', { startDate: '2026-10-01', endDate: '2026-10-02' })
      ],
      TODAY
    )
    expect(list.map((e) => e.id)).toEqual(['now', 'far'])
  })

  it('includes events already under way and puts them first', () => {
    const list = listUpcomingEvents(
      [
        event('soon', 'Soon', { startDate: '2026-10-10', endDate: '2026-10-10' }),
        event('camp', 'Camp', { startDate: '2026-10-05', endDate: '2026-10-12', allDay: true })
      ],
      TODAY
    )
    expect(list.map((e) => e.id)).toEqual(['camp', 'soon'])
  })

  it('orders by date, then all-day before timed, then start time', () => {
    const list = listUpcomingEvents(
      [
        event('late', 'Late', { startTime: '15:00', endTime: '16:00' }),
        event('early', 'Early', { startTime: '08:00', endTime: '09:00' }),
        event('all', 'All day', { allDay: true, startTime: null, endTime: null })
      ],
      TODAY
    )
    expect(list.map((e) => e.id)).toEqual(['all', 'early', 'late'])
  })
})

describe('describeUpcoming', () => {
  it('words how soon it is', () => {
    expect(describeUpcoming(event('a', 'A'), TODAY).label).toBe('Today')
    expect(
      describeUpcoming(event('a', 'A', { startDate: '2026-10-10', endDate: '2026-10-10' }), TODAY)
        .label
    ).toBe('Tomorrow')
    expect(
      describeUpcoming(event('a', 'A', { startDate: '2026-10-14', endDate: '2026-10-14' }), TODAY)
        .label
    ).toBe('In 5 days')
    expect(
      describeUpcoming(event('a', 'A', { startDate: '2026-10-05', endDate: '2026-10-12' }), TODAY)
        .label
    ).toBe('Ongoing')
  })

  it('shows dates as day/month/year and a time range or All day', () => {
    expect(describeUpcoming(event('a', 'A'), TODAY)).toMatchObject({
      dates: '09/10/2026',
      time: '10:00–11:00'
    })
    const span = describeUpcoming(
      event('b', 'B', {
        startDate: '2026-10-20',
        endDate: '2026-12-05',
        allDay: true,
        startTime: null,
        endTime: null
      }),
      TODAY
    )
    expect(span).toMatchObject({ dates: '20/10/2026 – 05/12/2026', time: 'All day' })
  })
})
