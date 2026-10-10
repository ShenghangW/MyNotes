import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings, CalendarEvent, NoteSummary, SettingsPatch, Todo } from '@shared/api'
import { createMockApi } from '../../../../test/mockApi'
import { toLocalIsoDate } from '../../lib/date'
import ClockWidget from './ClockWidget'
import HomePage from './HomePage'

const today = toLocalIsoDate()

function note(id: string, title: string, updatedAt: string): NoteSummary {
  return {
    id,
    title,
    preview: '',
    groupId: null,
    coverImagePath: null,
    createdAt: updatedAt,
    updatedAt
  }
}

describe('Home widgets', () => {
  let settings: AppSettings
  let notes: NoteSummary[]
  let events: CalendarEvent[]
  let todos: Todo[]

  beforeEach(() => {
    window.localStorage.clear()
    settings = {
      reminderLeadDays: 1,
      homeTitle: 'Home',
      homePhotoPath: null,
      homePhotoVisible: true,
      updatedAt: ''
    }
    notes = []
    events = []
    todos = []
    const base = createMockApi()
    window.api = createMockApi({
      settings: {
        get: vi.fn(async () => ({ ok: true as const, data: settings })),
        update: vi.fn(async (patch: SettingsPatch) => {
          settings = { ...settings, ...patch }
          return { ok: true as const, data: settings }
        })
      },
      notes: { ...base.notes, list: vi.fn(async () => ({ ok: true as const, data: notes })) },
      events: { ...base.events, list: vi.fn(async () => ({ ok: true as const, data: events })) },
      todos: { ...base.todos, list: vi.fn(async () => ({ ok: true as const, data: todos })) },
      images: {
        saveFromPath: vi.fn(async () => ({ ok: true as const, data: 'images/new.png' })),
        saveFromBytes: base.images.saveFromBytes,
        pathForFile: () => ''
      }
    })
  })

  describe('recent notes', () => {
    it('shows the most recently edited notes first and opens one on click', async () => {
      notes = [
        note('a', 'Oldest', '2026-10-01T10:00:00.000Z'),
        note('b', 'Newest', '2026-10-08T10:00:00.000Z'),
        note('c', 'Middle', '2026-10-05T10:00:00.000Z')
      ]
      const onOpenNote = vi.fn()
      render(<HomePage onOpenNote={onOpenNote} />)

      const buttons = await screen.findAllByRole('button', { name: /Newest|Middle|Oldest/ })
      expect(buttons.map((button) => button.textContent)).toEqual([
        expect.stringContaining('Newest'),
        expect.stringContaining('Middle'),
        expect.stringContaining('Oldest')
      ])
      fireEvent.click(buttons[1])
      expect(onOpenNote).toHaveBeenCalledWith('c')
    })

    it('shows only the five most recent', async () => {
      notes = Array.from({ length: 7 }, (_, i) =>
        note(`n${i}`, `Note ${i}`, `2026-10-0${i + 1}T10:00:00.000Z`)
      )
      render(<HomePage />)
      await screen.findByText('Note 6')
      expect(screen.queryByText('Note 1')).toBeNull()
      expect(screen.queryByText('Note 0')).toBeNull()
      expect(screen.getByText('Note 2')).toBeTruthy()
    })
  })

  describe('upcoming events', () => {
    const makeEvent = (
      id: string,
      title: string,
      startDate: string,
      extra: Partial<CalendarEvent> = {}
    ): CalendarEvent => ({
      id,
      title,
      startDate,
      startTime: '09:30',
      endDate: startDate,
      endTime: '11:00',
      allDay: false,
      color: 'red',
      reminderEnabled: false,
      todoId: null,
      createdAt: '',
      updatedAt: '',
      ...extra
    })

    it('lists upcoming events with day/month/year dates and opens the Calendar on click', async () => {
      events = [makeEvent('e1', 'Software exam', today)]
      todos = [
        {
          id: 't1',
          text: 'Hand in essay',
          done: false,
          dueDate: today,
          sortOrder: 0,
          createdAt: '',
          updatedAt: ''
        }
      ]
      const onOpenCalendar = vi.fn()
      render(<HomePage onOpenCalendar={onOpenCalendar} />)

      expect(await screen.findByText('Software exam')).toBeTruthy()
      expect(screen.getByText(/09:30–11:00/)).toBeTruthy()
      expect(screen.getByText('Today')).toBeTruthy()
      const widget = within(screen.getByRole('region', { name: 'Upcoming events' }))
      expect(
        widget.getByText(
          new RegExp(`${today.slice(8, 10)}/${today.slice(5, 7)}/${today.slice(0, 4)}`)
        )
      ).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Software exam: open calendar' }))
      expect(onOpenCalendar).toHaveBeenCalled()
    })

    it('is not limited to the next 7 days, and skips finished events', async () => {
      events = [
        makeEvent('far', 'Next year trip', '2999-01-05'),
        makeEvent('old', 'Finished thing', '2000-01-01')
      ]
      render(<HomePage />)
      expect(await screen.findByText('Next year trip')).toBeTruthy()
      expect(screen.queryByText('Finished thing')).toBeNull()
    })

    it('shows 3 by default and the chevron expands to the rest', async () => {
      events = [1, 2, 3, 4, 5].map((n) => makeEvent(`e${n}`, `Event ${n}`, `2999-01-0${n}`))
      render(<HomePage />)
      await screen.findByText('Event 1')
      expect(screen.getByText('Event 3')).toBeTruthy()
      expect(screen.queryByText('Event 4')).toBeNull()
      expect(screen.getByText('2 more')).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Show all 5 upcoming events' }))
      expect(screen.getByText('Event 5')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Show fewer events' }))
      expect(screen.queryByText('Event 5')).toBeNull()
    })

    it('folds away and unfolds again, keeping the heading and a count', async () => {
      events = [
        makeEvent('e1', 'Software exam', '2999-01-01'),
        makeEvent('e2', 'Quiz', '2999-01-02')
      ]
      render(<HomePage />)
      await screen.findByText('Software exam')

      fireEvent.click(screen.getByRole('button', { name: 'Fold upcoming events' }))
      expect(screen.queryByText('Software exam')).toBeNull()
      expect(screen.getByRole('heading', { name: 'Upcoming events' })).toBeTruthy()
      expect(screen.getByText('2 upcoming')).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Unfold upcoming events' }))
      expect(screen.getByText('Software exam')).toBeTruthy()
    })

    it('has no expand control for 3 or fewer, and says so when empty', async () => {
      events = []
      render(<HomePage />)
      expect(await screen.findByText('No upcoming events.')).toBeTruthy()
      expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull()
    })
  })

  describe('photo', () => {
    it('offers to add a photo, saves its path, and shows it', async () => {
      render(<HomePage />)
      fireEvent.click(await screen.findByRole('button', { name: /Add photo/ }))

      await waitFor(() =>
        expect(window.api.settings.update).toHaveBeenCalledWith({
          homePhotoPath: 'images/new.png',
          homePhotoVisible: true
        })
      )
      const image = (await screen.findByAltText('Home')) as HTMLImageElement
      expect(image.src).toContain('images/new.png')
    })

    it('hides the photo without removing it, and can show it again', async () => {
      settings = { ...settings, homePhotoPath: 'images/mine.png' }
      render(<HomePage />)
      await screen.findByAltText('Home')

      fireEvent.click(screen.getByRole('button', { name: 'Hide' }))
      expect(await screen.findByText('Photo hidden')).toBeTruthy()
      expect(window.api.settings.update).toHaveBeenCalledWith({ homePhotoVisible: false })
      expect(settings.homePhotoPath).toBe('images/mine.png') // the file reference stays

      fireEvent.click(screen.getByRole('button', { name: 'Show photo' }))
      expect(await screen.findByAltText('Home')).toBeTruthy()
    })

    it('starts hidden when it was hidden last time', async () => {
      settings = { ...settings, homePhotoPath: 'images/mine.png', homePhotoVisible: false }
      render(<HomePage />)
      expect(await screen.findByText('Photo hidden')).toBeTruthy()
      expect(screen.queryByAltText('Home')).toBeNull()
    })

    it('removes the photo', async () => {
      settings = { ...settings, homePhotoPath: 'images/mine.png' }
      render(<HomePage />)
      await screen.findByAltText('Home')
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
      await waitFor(() => expect(screen.queryByAltText('Home')).toBeNull())
      expect(window.api.settings.update).toHaveBeenCalledWith({ homePhotoPath: null })
      expect(screen.getByText('No photo yet')).toBeTruthy()
    })
  })
})

describe('Clock widget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 9, 9, 5, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the 24-hour time and date, and ticks forward', () => {
    render(<ClockWidget />)
    expect(screen.getByTestId('clock-time').textContent).toBe('09:05')
    expect(screen.getByText('09/10/2026')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByTestId('clock-time').textContent).toBe('09:06')
  })
})
