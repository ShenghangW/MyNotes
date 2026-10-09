import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Todo } from '@shared/api'
import { createMockApi } from '../../../../test/mockApi'
import { toLocalIsoDate } from '../../lib/date'
import HomePage from './HomePage'

function todo(id: string, text: string, extra: Partial<Todo> = {}): Todo {
  return {
    id,
    text,
    done: false,
    dueDate: null,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
    ...extra
  }
}

const openForm = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Add to-do' }))
}

describe('To-do widget on Home', () => {
  let store: Todo[]

  beforeEach(() => {
    window.localStorage.clear()
    store = [todo('1', 'Buy milk'), todo('2', 'Old task', { done: true })]
    const base = createMockApi()
    window.api = createMockApi({
      todos: {
        ...base.todos,
        list: vi.fn(async () => ({ ok: true as const, data: store })),
        create: vi.fn(async ({ text, dueDate }: { text: string; dueDate?: string | null }) => {
          const created = todo(`n${store.length + 1}`, text.trim(), { dueDate: dueDate ?? null })
          store = [...store, created]
          return { ok: true as const, data: created }
        }),
        update: vi.fn(async (patch: { id: string; done?: boolean; dueDate?: string | null }) => {
          store = store.map((t) =>
            t.id === patch.id
              ? {
                  ...t,
                  done: patch.done ?? t.done,
                  dueDate: patch.dueDate === undefined ? t.dueDate : patch.dueDate
                }
              : t
          )
          return { ok: true as const, data: store.find((t) => t.id === patch.id)! }
        }),
        delete: vi.fn(async ({ id }: { id: string }) => {
          store = store.filter((t) => t.id !== id)
          return { ok: true as const, data: null }
        })
      }
    })
  })

  it('shows saved to-dos with done items checked and a remaining count', async () => {
    render(<HomePage />)
    expect(await screen.findByText('Buy milk')).toBeTruthy()
    expect(screen.getByText('Old task')).toBeTruthy()
    expect((screen.getByLabelText('Mark "Old task" as done') as HTMLInputElement).checked).toBe(
      true
    )
    expect(screen.getByTestId('todo-remaining').textContent).toBe('1 remaining')
  })

  it('hides the add form until the + icon is clicked', async () => {
    render(<HomePage />)
    await screen.findByText('Buy milk')
    expect(screen.queryByLabelText('New to-do')).toBeNull()

    openForm()
    expect(screen.getByLabelText('New to-do')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText('New to-do')).toBeNull()
  })

  it('Escape closes the add form without saving', async () => {
    render(<HomePage />)
    await screen.findByText('Buy milk')
    openForm()
    fireEvent.change(screen.getByLabelText('New to-do'), { target: { value: 'Nope' } })
    fireEvent.keyDown(screen.getByLabelText('New to-do'), { key: 'Escape' })
    expect(screen.queryByLabelText('New to-do')).toBeNull()
    expect(window.api.todos.create).not.toHaveBeenCalled()
  })

  it('adds a to-do with Enter, with an optional due date, then closes the form', async () => {
    render(<HomePage />)
    await screen.findByText('Buy milk')
    openForm()

    const input = screen.getByLabelText('New to-do') as HTMLInputElement
    fireEvent.change(input, { target: { value: '  Hand in essay ' } })
    fireEvent.change(screen.getByLabelText('Due date (optional)'), {
      target: { value: '2099-01-02' }
    })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByText('Hand in essay')).toBeTruthy()
    expect(window.api.todos.create).toHaveBeenCalledWith({
      text: '  Hand in essay ',
      dueDate: '2099-01-02'
    })
    await waitFor(() => expect(screen.queryByLabelText('New to-do')).toBeNull())
    expect(screen.getByTestId('todo-due').textContent).toContain('02/01/2099')
  })

  it('does not add an empty to-do', async () => {
    render(<HomePage />)
    await screen.findByText('Buy milk')
    openForm()
    const addButton = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(addButton.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('New to-do'), { target: { value: '   ' } })
    fireEvent.keyDown(screen.getByLabelText('New to-do'), { key: 'Enter' })
    expect(window.api.todos.create).not.toHaveBeenCalled()
  })

  it('checks a to-do off and saves it', async () => {
    render(<HomePage />)
    const checkbox = (await screen.findByLabelText('Mark "Buy milk" as done')) as HTMLInputElement

    fireEvent.click(checkbox)

    await waitFor(() =>
      expect(window.api.todos.update).toHaveBeenCalledWith({ id: '1', done: true })
    )
    await waitFor(() =>
      expect(screen.getByTestId('todo-remaining').textContent).toBe('0 remaining')
    )
    expect(checkbox.checked).toBe(true)
  })

  it('deletes a to-do', async () => {
    render(<HomePage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete "Buy milk"' }))

    await waitFor(() => expect(screen.queryByText('Buy milk')).toBeNull())
    expect(window.api.todos.delete).toHaveBeenCalledWith({ id: '1' })
  })

  it('flags overdue items only while they are not done', async () => {
    store = [
      todo('1', 'Late', { dueDate: '2000-01-01' }),
      todo('2', 'Late but done', { dueDate: '2000-01-01', done: true }),
      todo('3', 'Later', { dueDate: '2999-01-01' })
    ]
    render(<HomePage />)
    await screen.findByText('Late')

    const labels = screen.getAllByTestId('todo-due').map((el) => el.textContent ?? '')
    expect(labels.filter((label) => label.startsWith('Overdue'))).toHaveLength(1)
    expect(toLocalIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('changes and clears a due date from the row', async () => {
    store = [todo('1', 'Dated', { dueDate: '2999-05-05' })]
    render(<HomePage />)
    const dateInput = await screen.findByLabelText('Due date for "Dated"')

    fireEvent.change(dateInput, { target: { value: '' } })
    await waitFor(() =>
      expect(window.api.todos.update).toHaveBeenCalledWith({ id: '1', dueDate: null })
    )
    await waitFor(() => expect(screen.queryByTestId('todo-due')).toBeNull())
  })

  it('shows an error when saving fails and reloads the saved state', async () => {
    window.api.todos.update = vi.fn(async () => ({ ok: false as const, error: 'disk full' }))
    render(<HomePage />)
    fireEvent.click(await screen.findByLabelText('Mark "Buy milk" as done'))

    expect((await screen.findByRole('alert')).textContent).toBe('disk full')
    await waitFor(() =>
      expect((screen.getByLabelText('Mark "Buy milk" as done') as HTMLInputElement).checked).toBe(
        false
      )
    )
  })

  describe('long lists', () => {
    beforeEach(() => {
      store = Array.from({ length: 8 }, (_, i) => todo(`${i + 1}`, `Task ${i + 1}`))
    })

    it('shows only 5 to-dos until expanded', async () => {
      render(<HomePage />)
      await screen.findByText('Task 1')
      expect(screen.getByText('Task 5')).toBeTruthy()
      expect(screen.queryByText('Task 6')).toBeNull()
      expect(screen.getByText('3 more')).toBeTruthy()
    })

    it('the chevron expands to show every to-do and collapses again', async () => {
      render(<HomePage />)
      await screen.findByText('Task 1')
      fireEvent.click(screen.getByRole('button', { name: 'Show all 8 to-dos' }))
      expect(screen.getByText('Task 8')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Show fewer to-dos' }))
      expect(screen.queryByText('Task 8')).toBeNull()
    })

    it('has no expand control for 5 or fewer', async () => {
      store = store.slice(0, 5)
      render(<HomePage />)
      await screen.findByText('Task 1')
      expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull()
    })
  })

  describe('folding', () => {
    it('folds the whole list away and unfolds it again', async () => {
      render(<HomePage />)
      await screen.findByText('Buy milk')

      fireEvent.click(screen.getByRole('button', { name: 'Fold to-do list' }))
      expect(screen.queryByText('Buy milk')).toBeNull()
      expect(screen.getByRole('heading', { name: 'To-do' })).toBeTruthy()
      expect(screen.getByTestId('todo-remaining').textContent).toBe('1 remaining')

      fireEvent.click(screen.getByRole('button', { name: 'Unfold to-do list' }))
      expect(screen.getByText('Buy milk')).toBeTruthy()
    })

    it('remembers being folded when Home is opened again', async () => {
      const first = render(<HomePage />)
      await screen.findByText('Buy milk')
      fireEvent.click(screen.getByRole('button', { name: 'Fold to-do list' }))
      first.unmount()

      render(<HomePage />)
      expect(await screen.findByRole('button', { name: 'Unfold to-do list' })).toBeTruthy()
      expect(screen.queryByText('Buy milk')).toBeNull()
    })

    it('the + icon unfolds the list and opens the add form', async () => {
      render(<HomePage />)
      await screen.findByText('Buy milk')
      fireEvent.click(screen.getByRole('button', { name: 'Fold to-do list' }))

      fireEvent.click(screen.getByRole('button', { name: 'Add to-do' }))
      expect(screen.getByText('Buy milk')).toBeTruthy()
      expect(screen.getByLabelText('New to-do')).toBeTruthy()
    })
  })
})
