import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalendarEvent, DueReminder } from '@shared/api'
import { createMockApi } from '../../../test/mockApi'
import { EVENTS_CHANGED } from '../hooks/useEvents'
import ReminderPopup, { REMINDER_CHECK_MS } from './ReminderPopup'

function reminder(id: string, title: string, daysUntil: number): DueReminder {
  const event: CalendarEvent = {
    id,
    title,
    startDate: '2026-10-09',
    startTime: null,
    endDate: '2026-10-09',
    endTime: null,
    allDay: true,
    color: 'blue',
    todoId: null,
    reminderEnabled: true,
    createdAt: '',
    updatedAt: ''
  }
  return { event, daysUntil }
}

describe('ReminderPopup', () => {
  let due: DueReminder[]

  beforeEach(() => {
    due = [reminder('e1', 'Assignment due', 1)]
    const base = createMockApi()
    window.api = createMockApi({
      events: {
        ...base.events,
        listDueReminders: vi.fn(async () => ({ ok: true as const, data: due })),
        dismissReminder: vi.fn(async ({ eventId }: { eventId: string }) => {
          due = due.filter((item) => item.event.id !== eventId)
          return { ok: true as const, data: null }
        })
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows nothing when no reminders are due', async () => {
    due = []
    render(<ReminderPopup />)
    await waitFor(() => expect(window.api.events.listDueReminders).toHaveBeenCalled())
    expect(screen.queryByRole('region', { name: 'Event reminders' })).toBeNull()
  })

  it('shows a due reminder with how soon it is', async () => {
    render(<ReminderPopup />)
    expect(await screen.findByText('Assignment due')).toBeTruthy()
    expect(screen.getByText('tomorrow')).toBeTruthy()
  })

  it('dismisses a reminder and hides the popup', async () => {
    render(<ReminderPopup />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Dismiss reminder for "Assignment due"' })
    )

    await waitFor(() => expect(screen.queryByText('Assignment due')).toBeNull())
    expect(window.api.events.dismissReminder).toHaveBeenCalledWith({ eventId: 'e1' })
  })

  it('dismisses several at once', async () => {
    due = [reminder('e1', 'Quiz', 0), reminder('e2', 'Essay', 2)]
    render(<ReminderPopup />)
    expect(await screen.findByText('2 upcoming events')).toBeTruthy()
    expect(screen.getByText('in 2 days')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss all' }))
    await waitFor(() => expect(screen.queryByText('Quiz')).toBeNull())
    expect(window.api.events.dismissReminder).toHaveBeenCalledTimes(2)
  })

  it('re-checks when an event changes', async () => {
    due = []
    render(<ReminderPopup />)
    await waitFor(() => expect(window.api.events.listDueReminders).toHaveBeenCalledTimes(1))

    due = [reminder('e9', 'Just added', 1)]
    act(() => {
      window.dispatchEvent(new Event(EVENTS_CHANGED))
    })
    expect(await screen.findByText('Just added')).toBeTruthy()
  })

  it('re-checks on a timer while the app stays open', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    due = []
    render(<ReminderPopup />)
    await vi.waitFor(() => expect(window.api.events.listDueReminders).toHaveBeenCalledTimes(1))

    due = [reminder('e7', 'Midnight rollover', 0)]
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REMINDER_CHECK_MS)
    })
    expect(await screen.findByText('Midnight rollover')).toBeTruthy()
  })
})
