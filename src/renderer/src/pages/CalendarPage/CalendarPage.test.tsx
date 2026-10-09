import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CalendarEvent,
  EventCreateInput,
  EventUpdateInput,
  Todo,
  TodoCreateInput,
  TodoUpdateInput
} from '@shared/api'
import { createMockApi } from '../../../../test/mockApi'
import { toLocalIsoDate } from '../../lib/date'
import CalendarPage from './CalendarPage'

const today = toLocalIsoDate()

function event(id: string, title: string, extra: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id,
    title,
    startDate: today,
    startTime: '10:00',
    endDate: today,
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

function todo(id: string, text: string, extra: Partial<Todo> = {}): Todo {
  return {
    id,
    text,
    done: false,
    dueDate: today,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
    ...extra
  }
}

describe('Calendar page', () => {
  let events: CalendarEvent[]
  let todos: Todo[]

  beforeEach(() => {
    events = [event('e1', 'Exam', { reminderEnabled: true })]
    todos = [todo('t1', 'Hand in essay')]
    const base = createMockApi()
    window.api = createMockApi({
      events: {
        ...base.events,
        list: vi.fn(async () => ({ ok: true as const, data: events })),
        create: vi.fn(async (input: EventCreateInput) => {
          const created = event(`n${events.length + 1}`, input.title.trim(), {
            startDate: input.startDate,
            endDate: input.endDate ?? input.startDate,
            allDay: input.allDay ?? false,
            startTime: input.startTime ?? null,
            endTime: input.endTime ?? null
          })
          events = [...events, created]
          return { ok: true as const, data: created }
        }),
        update: vi.fn(async (patch: EventUpdateInput) => {
          events = events.map((e) =>
            e.id === patch.id ? ({ ...e, ...patch } as CalendarEvent) : e
          )
          return { ok: true as const, data: events.find((e) => e.id === patch.id)! }
        }),
        delete: vi.fn(async ({ id }: { id: string }) => {
          events = events.filter((e) => e.id !== id)
          return { ok: true as const, data: null }
        })
      },
      todos: {
        ...base.todos,
        list: vi.fn(async () => ({ ok: true as const, data: todos })),
        create: vi.fn(async (input: TodoCreateInput) => {
          const created = todo(`t${todos.length + 1}`, input.text.trim(), {
            dueDate: input.dueDate ?? null
          })
          todos = [...todos, created]
          return { ok: true as const, data: created }
        }),
        update: vi.fn(async (patch: TodoUpdateInput) => {
          todos = todos.map((t) => (t.id === patch.id ? { ...t, ...patch } : t))
          return { ok: true as const, data: todos.find((t) => t.id === patch.id)! }
        }),
        delete: vi.fn(async ({ id }: { id: string }) => {
          todos = todos.filter((t) => t.id !== id)
          return { ok: true as const, data: null }
        })
      }
    })
  })

  const openNewEvent = async (): Promise<HTMLElement> => {
    await screen.findByText(/Exam/)
    fireEvent.click(screen.getByRole('button', { name: /New event/ }))
    return screen.getByRole('dialog')
  }

  it('shows a month grid with Month / Week / Day switching and saved items', async () => {
    render(<CalendarPage />)
    expect(await screen.findByText(/Exam/)).toBeTruthy()
    expect(await screen.findByText(/Hand in essay/)).toBeTruthy()
    expect(document.querySelector('.fc-dayGridMonth-view')).toBeTruthy()
    for (const name of ['Month', 'Week', 'Day']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })

  it('does not draw a to-do twice when an event created it', async () => {
    events = [event('e1', 'Exam', { todoId: 't1' })]
    todos = [todo('t1', 'Exam')]
    render(<CalendarPage />)
    await screen.findByText(/Exam/)
    expect(screen.getAllByText(/Exam/)).toHaveLength(1)
  })

  it('creates a timed multi-day event with 24-hour times and no to-do by default', async () => {
    render(<CalendarPage />)
    const dialog = await openNewEvent()

    expect((within(dialog).getByLabelText('Add to to-do list') as HTMLInputElement).checked).toBe(
      false
    )
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: '  Camp  ' } })
    fireEvent.change(within(dialog).getByLabelText('Start date'), {
      target: { value: '2999-01-02' }
    })
    fireEvent.change(within(dialog).getByLabelText('Start hour'), { target: { value: '09' } })
    fireEvent.change(within(dialog).getByLabelText('Start minute'), { target: { value: '30' } })
    // Moving the start keeps the length (1h), so the end follows.
    expect((within(dialog).getByLabelText('End hour') as HTMLSelectElement).value).toBe('10')
    fireEvent.change(within(dialog).getByLabelText('End date'), { target: { value: '2999-03-05' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Green' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(window.api.events.create).toHaveBeenCalledWith({
      title: '  Camp  ',
      startDate: '2999-01-02',
      startTime: '09:30',
      endDate: '2999-03-05',
      endTime: '10:30',
      allDay: false,
      color: 'green',
      reminderEnabled: false,
      addToTodo: false
    })
    expect(window.api.todos.create).not.toHaveBeenCalled()
  })

  it('the All-day toggle hides the times and sends none', async () => {
    render(<CalendarPage />)
    const dialog = await openNewEvent()

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Holiday' } })
    fireEvent.click(within(dialog).getByLabelText('All-day'))
    expect(within(dialog).queryByLabelText('Start hour')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(window.api.events.create).toHaveBeenCalled())
    expect(vi.mocked(window.api.events.create).mock.calls[0][0]).toMatchObject({
      allDay: true,
      startTime: null,
      endTime: null
    })
  })

  it('sends addToTodo only when the toggle is switched on', async () => {
    render(<CalendarPage />)
    const dialog = await openNewEvent()
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Essay due' } })
    fireEvent.click(within(dialog).getByLabelText('Add to to-do list'))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(window.api.events.create).toHaveBeenCalled())
    expect(vi.mocked(window.api.events.create).mock.calls[0][0].addToTodo).toBe(true)
  })

  it('blocks saving when the end is not after the start, or the title is empty', async () => {
    render(<CalendarPage />)
    const dialog = await openNewEvent()
    const save = within(dialog).getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(save.disabled).toBe(true) // no title yet

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Quiz' } })
    expect(save.disabled).toBe(false)

    fireEvent.change(within(dialog).getByLabelText('End date'), { target: { value: '2000-01-01' } })
    expect(save.disabled).toBe(true)
    expect(within(dialog).getByTestId('schedule-problem').textContent).toContain(
      'End must be after'
    )
    expect(window.api.events.create).not.toHaveBeenCalled()
  })

  it('edits an event when it is clicked', async () => {
    render(<CalendarPage />)
    fireEvent.click(await screen.findByText(/Exam/))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Edit event')).toBeTruthy()
    expect((within(dialog).getByLabelText('Title') as HTMLInputElement).value).toBe('Exam')
    expect((within(dialog).getByLabelText('Start hour') as HTMLSelectElement).value).toBe('10')

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Final exam' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(window.api.events.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'e1',
          title: 'Final exam',
          startTime: '10:00',
          endTime: '11:00'
        })
      )
    )
    expect(await screen.findByText(/Final exam/)).toBeTruthy()
  })

  it('deletes an event only after confirming', async () => {
    render(<CalendarPage />)
    fireEvent.click(await screen.findByText(/Exam/))

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(window.api.events.delete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => expect(screen.queryByText(/Exam/)).toBeNull())
    expect(window.api.events.delete).toHaveBeenCalledWith({ id: 'e1' })
  })

  it('Escape closes the modal without saving', async () => {
    render(<CalendarPage />)
    await openNewEvent()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.api.events.create).not.toHaveBeenCalled()
  })

  it('shows an error in the modal when saving fails and keeps it open', async () => {
    window.api.events.create = vi.fn(async () => ({ ok: false as const, error: 'disk full' }))
    render(<CalendarPage />)
    const dialog = await openNewEvent()
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Quiz' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect((await screen.findByRole('alert')).textContent).toBe('disk full')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  describe('expanded day', () => {
    const openDay = async (): Promise<HTMLElement> => {
      await screen.findByText(/Exam/)
      fireEvent.click(screen.getByRole('button', { name: 'Day' }))
      return await screen.findByRole('complementary', { name: 'To-dos for this day' })
    }

    it('shows a 24-hour time grid and the to-dos due that day', async () => {
      render(<CalendarPage />)
      const panel = await openDay()
      expect(document.querySelector('.fc-timeGridDay-view')).toBeTruthy()
      expect(within(panel).getByDisplayValue('Hand in essay')).toBeTruthy()
      expect(document.body.textContent).toContain('23:00')
    })

    it('does not show the panel in the month view', async () => {
      render(<CalendarPage />)
      await screen.findByText(/Exam/)
      expect(screen.queryByRole('complementary', { name: 'To-dos for this day' })).toBeNull()
    })

    it('checks off, renames, re-dates and deletes a to-do from the day panel', async () => {
      render(<CalendarPage />)
      const panel = await openDay()

      fireEvent.click(within(panel).getByLabelText('Mark "Hand in essay" as done'))
      await waitFor(() =>
        expect(window.api.todos.update).toHaveBeenCalledWith({ id: 't1', done: true })
      )

      const input = within(panel).getByLabelText('Edit "Hand in essay"')
      fireEvent.change(input, { target: { value: 'Hand in essay v2' } })
      fireEvent.blur(input)
      await waitFor(() =>
        expect(window.api.todos.update).toHaveBeenCalledWith({ id: 't1', text: 'Hand in essay v2' })
      )

      fireEvent.change(within(panel).getByLabelText(/Due date for/), {
        target: { value: '2999-01-01' }
      })
      await waitFor(() =>
        expect(window.api.todos.update).toHaveBeenCalledWith({ id: 't1', dueDate: '2999-01-01' })
      )
    })

    it('adds a to-do for the open day and can delete it', async () => {
      render(<CalendarPage />)
      const panel = await openDay()

      fireEvent.change(within(panel).getByLabelText('New to-do for this day'), {
        target: { value: 'Read chapter 4' }
      })
      fireEvent.click(within(panel).getByRole('button', { name: 'Add to-do for this day' }))
      await waitFor(() =>
        expect(window.api.todos.create).toHaveBeenCalledWith({
          text: 'Read chapter 4',
          dueDate: today
        })
      )

      fireEvent.click(await within(panel).findByLabelText('Delete "Read chapter 4"'))
      await waitFor(() => expect(window.api.todos.delete).toHaveBeenCalledWith({ id: 't2' }))
    })

    it('reloads to-dos after saving an event so a linked to-do appears', async () => {
      render(<CalendarPage />)
      const panel = await openDay()
      const listCalls = vi.mocked(window.api.todos.list).mock.calls.length

      fireEvent.click(screen.getByRole('button', { name: /New event/ }))
      const dialog = screen.getByRole('dialog')
      fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Quiz' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

      await waitFor(() =>
        expect(vi.mocked(window.api.todos.list).mock.calls.length).toBeGreaterThan(listCalls)
      )
      expect(panel).toBeTruthy()
    })
  })
})
