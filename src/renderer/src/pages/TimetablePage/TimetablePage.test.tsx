import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimetableCreateInput, TimetableEntry, TimetableUpdateInput } from '@shared/api'
import { createMockApi } from '../../../../test/mockApi'
import TimetablePage from './TimetablePage'

function entry(id: string, title: string, extra: Partial<TimetableEntry> = {}): TimetableEntry {
  return {
    id,
    dayOfWeek: 0,
    startTime: '12:30',
    endTime: '14:30',
    title,
    description: null,
    color: 'blue',
    updatedAt: '',
    ...extra
  }
}

describe('Timetable page', () => {
  let entries: TimetableEntry[]
  let nextId: number

  beforeEach(() => {
    entries = [entry('c1', 'Software Testing', { description: 'Room 080.02.007' })]
    nextId = 2
    const base = createMockApi()
    window.api = createMockApi({
      timetable: {
        ...base.timetable,
        list: vi.fn(async () => ({ ok: true as const, data: entries })),
        create: vi.fn(async (input: TimetableCreateInput) => {
          const created = input.days.map((day) =>
            entry(`n${nextId++}`, input.title.trim(), {
              dayOfWeek: day,
              startTime: input.startTime,
              endTime: input.endTime,
              description: input.description?.trim() || null,
              color: input.color ?? 'blue'
            })
          )
          entries = [...entries, ...created]
          return { ok: true as const, data: created }
        }),
        update: vi.fn(async (patch: TimetableUpdateInput) => {
          entries = entries.map((e) =>
            e.id === patch.id ? ({ ...e, ...patch } as TimetableEntry) : e
          )
          return { ok: true as const, data: entries.find((e) => e.id === patch.id)! }
        }),
        delete: vi.fn(async ({ id }: { id: string }) => {
          entries = entries.filter((e) => e.id !== id)
          return { ok: true as const, data: null }
        })
      }
    })
  })

  const openNewClass = async (): Promise<HTMLElement> => {
    await screen.findByText('Software Testing')
    fireEvent.click(screen.getByRole('button', { name: /Add class/ }))
    return screen.getByRole('dialog')
  }

  it('shows the seven days and the saved class with its time and description', async () => {
    render(<TimetablePage />)
    expect(await screen.findByText('Software Testing')).toBeTruthy()
    expect(screen.getByText('12:30–14:30')).toBeTruthy()
    expect(screen.getByText('Room 080.02.007')).toBeTruthy()
    for (const day of [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ]) {
      expect(screen.getByText(day)).toBeTruthy()
    }
    const monday = screen.getByRole('group', { name: 'Monday classes' })
    expect(within(monday).getByText('Software Testing')).toBeTruthy()
  })

  it('adds a class on several days with a title, times and optional description', async () => {
    render(<TimetablePage />)
    const dialog = await openNewClass()

    const save = within(dialog).getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(save.disabled).toBe(true) // no title or day yet

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: '  Networks ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tuesday' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Thursday' }))
    fireEvent.change(within(dialog).getByLabelText('Start hour'), { target: { value: '10' } })
    // Moving the start keeps the length (1h), so the end follows.
    expect((within(dialog).getByLabelText('End hour') as HTMLSelectElement).value).toBe('11')
    fireEvent.change(within(dialog).getByLabelText('End minute'), { target: { value: '30' } })
    fireEvent.change(within(dialog).getByLabelText('Description'), {
      target: { value: 'Building 80, Level 4' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Green' }))
    expect(save.disabled).toBe(false)
    fireEvent.click(save)

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(window.api.timetable.create).toHaveBeenCalledWith({
      title: '  Networks ',
      days: [1, 3],
      startTime: '10:00',
      endTime: '11:30',
      description: 'Building 80, Level 4',
      color: 'green'
    })
    expect(await screen.findAllByText('Networks')).toHaveLength(2)
  })

  it('clicking an empty spot in a day opens a new class on that day and time', async () => {
    render(<TimetablePage />)
    await screen.findByText('Software Testing')
    fireEvent.click(screen.getByRole('group', { name: 'Wednesday classes' }), { clientY: 56 * 3 })
    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('button', { name: 'Wednesday' }).getAttribute('aria-pressed')
    ).toBe('true')
    expect((within(dialog).getByLabelText('Start hour') as HTMLSelectElement).value).toBe('11')
    expect((within(dialog).getByLabelText('End hour') as HTMLSelectElement).value).toBe('12')
  })

  it('edits an existing class', async () => {
    render(<TimetablePage />)
    fireEvent.click(await screen.findByText('Software Testing'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Edit class')).toBeTruthy()
    expect((within(dialog).getByLabelText('Title') as HTMLInputElement).value).toBe(
      'Software Testing'
    )
    expect((within(dialog).getByLabelText('Description') as HTMLTextAreaElement).value).toBe(
      'Room 080.02.007'
    )

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Testing' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Friday' }))
    // Editing moves one class, so choosing Friday replaces Monday.
    expect(
      within(dialog).getByRole('button', { name: 'Monday' }).getAttribute('aria-pressed')
    ).toBe('false')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(window.api.timetable.update).toHaveBeenCalledWith({
      id: 'c1',
      title: 'Testing',
      dayOfWeek: 4,
      startTime: '12:30',
      endTime: '14:30',
      description: 'Room 080.02.007',
      color: 'blue'
    })
    expect(await screen.findByText('Testing')).toBeTruthy()
  })

  it('deletes a class after confirming', async () => {
    render(<TimetablePage />)
    fireEvent.click(await screen.findByText('Software Testing'))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(window.api.timetable.delete).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(window.api.timetable.delete).toHaveBeenCalledWith({ id: 'c1' })
    await waitFor(() => expect(screen.queryByText('Software Testing')).toBeNull())
  })

  it('draws overlapping classes side by side in the same day', async () => {
    entries = [
      entry('c1', 'Lecture', { startTime: '12:00', endTime: '14:00' }),
      entry('c2', 'Practical', { startTime: '13:00', endTime: '15:00' })
    ]
    render(<TimetablePage />)
    const lecture = (await screen.findByText('Lecture')).closest('button')!
    const practical = screen.getByText('Practical').closest('button')!
    expect(lecture.style.width).toBe(practical.style.width)
    expect(lecture.style.left).not.toBe(practical.style.left)
  })

  it('blocks saving when the end is not after the start', async () => {
    render(<TimetablePage />)
    const dialog = await openNewClass()
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Quiz' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Monday' }))
    const save = within(dialog).getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(save.disabled).toBe(false)

    fireEvent.change(within(dialog).getByLabelText('End hour'), { target: { value: '08' } })
    expect(screen.getByTestId('time-problem')).toBeTruthy()
    expect(save.disabled).toBe(true)
  })

  it('shows the error from the main process (e.g. a bad time) and keeps the form open', async () => {
    window.api.timetable.create = vi.fn(async () => ({
      ok: false as const,
      error: 'Start time must be a 24-hour time (HH:MM)'
    }))
    render(<TimetablePage />)
    const dialog = await openNewClass()
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Clash' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Monday' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect((await within(dialog).findByRole('alert')).textContent).toContain('24-hour')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
