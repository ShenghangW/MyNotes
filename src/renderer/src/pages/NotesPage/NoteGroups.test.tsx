import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NoteGroup, NoteSummary, NotesFilter } from '@shared/api'
import { createMockApi } from '../../../../test/mockApi'
import NotesPage from './NotesPage'

vi.mock('./NoteEditor', () => ({
  default: ({ noteId }: { noteId: string }) => <p data-testid="editor">editing {noteId}</p>
}))

function note(id: string, title: string, groupId: string | null): NoteSummary {
  return {
    id,
    title,
    preview: '',
    groupId,
    coverImagePath: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  }
}

function group(id: string, name: string): NoteGroup {
  return { id, name, sortOrder: 0, createdAt: '', updatedAt: '' }
}

describe('Notes page groups', () => {
  const school = group('g1', 'School')
  const work = group('g2', 'Work')
  let all: NoteSummary[]
  let groups: NoteGroup[]

  beforeEach(() => {
    groups = [school, work]
    all = [note('1', 'Essay', 'g1'), note('2', 'Report', 'g2'), note('3', 'Loose', null)]
    const base = createMockApi()
    const pick = (filter?: NotesFilter): NoteSummary[] =>
      all.filter((n) => (filter?.groupId === undefined ? true : n.groupId === filter.groupId))
    window.api = createMockApi({
      groups: {
        ...base.groups,
        list: vi.fn(async () => ({ ok: true as const, data: groups })),
        create: vi.fn(async ({ name }: { name: string }) => {
          const created = group('g3', name)
          groups = [...groups, created]
          return { ok: true as const, data: created }
        }),
        rename: vi.fn(async ({ id, name }: { id: string; name: string }) => {
          groups = groups.map((g) => (g.id === id ? { ...g, name } : g))
          return { ok: true as const, data: groups.find((g) => g.id === id)! }
        }),
        delete: vi.fn(async ({ id }: { id: string }) => {
          groups = groups.filter((g) => g.id !== id)
          return { ok: true as const, data: null }
        })
      },
      notes: {
        ...base.notes,
        list: vi.fn(async (filter?: NotesFilter) => ({ ok: true as const, data: pick(filter) })),
        create: vi.fn(async () => ({
          ok: true as const,
          data: { ...note('9', 'Untitled', null), contentJson: '[]' }
        }))
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('filters the list by group, ungrouped, and all', async () => {
    render(<NotesPage />)
    expect(await screen.findByText('Essay')).toBeTruthy()
    expect(screen.getByText('Loose')).toBeTruthy()

    fireEvent.click(await screen.findByRole('button', { name: 'School' }))
    await waitFor(() => expect(screen.queryByText('Report')).toBeNull())
    expect(screen.getByText('Essay')).toBeTruthy()
    expect(screen.queryByText('Loose')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Ungrouped' }))
    await waitFor(() => expect(screen.queryByText('Essay')).toBeNull())
    expect(screen.getByText('Loose')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'All notes' }))
    expect(await screen.findByText('Report')).toBeTruthy()
  })

  it('sends the group filter together with the search query', async () => {
    render(<NotesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Work' }))
    await screen.findByText('Report')

    window.api.notes.search = vi.fn(async () => ({ ok: true as const, data: [] }))
    fireEvent.change(screen.getByPlaceholderText('Search title and content'), {
      target: { value: 'quarterly' }
    })
    await waitFor(() =>
      expect(window.api.notes.search).toHaveBeenCalledWith({ query: 'quarterly', groupId: 'g2' })
    )
  })

  it('creates a group from the sidebar list', async () => {
    render(<NotesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'New group' }))
    const input = screen.getByLabelText('New group name')
    fireEvent.change(input, { target: { value: 'Games' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByRole('button', { name: 'Games' })).toBeTruthy()
    expect(window.api.groups.create).toHaveBeenCalledWith({ name: 'Games' })
  })

  it('renames a group', async () => {
    render(<NotesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rename group School' }))
    const input = screen.getByLabelText('Rename group School')
    fireEvent.change(input, { target: { value: 'Uni' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByRole('button', { name: 'Uni' })).toBeTruthy()
    expect(window.api.groups.rename).toHaveBeenCalledWith({ id: 'g1', name: 'Uni' })
  })

  it('deleting the selected group returns to All notes', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<NotesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'School' }))
    await waitFor(() => expect(screen.queryByText('Report')).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: 'Delete group School' }))

    await waitFor(() => expect(window.api.groups.delete).toHaveBeenCalledWith({ id: 'g1' }))
    expect(await screen.findByText('Report')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'School' })).toBeNull()
  })

  it('shows a rejected group name error', async () => {
    window.api.groups.create = vi.fn(async () => ({
      ok: false as const,
      error: 'A group named "School" already exists'
    }))
    render(<NotesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'New group' }))
    const input = screen.getByLabelText('New group name')
    fireEvent.change(input, { target: { value: 'School' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect((await screen.findByRole('alert')).textContent).toContain('already exists')
  })

  it('new notes inherit the group being viewed', async () => {
    render(<NotesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Work' }))
    await screen.findByText('Report')

    fireEvent.click(screen.getByRole('button', { name: 'New note' }))
    await screen.findByTestId('editor')
    expect(window.api.notes.create).toHaveBeenCalledWith({ groupId: 'g2' })
  })

  it('moves a note to another group from its card without opening it', async () => {
    window.api.notes.update = vi.fn(async () => ({
      ok: true as const,
      data: { ...note('3', 'Loose', 'g2'), contentJson: '[]' }
    }))
    render(<NotesPage />)
    const select = (await screen.findByLabelText('Group for Loose')) as HTMLSelectElement
    expect(select.value).toBe('')

    fireEvent.doubleClick(select)
    fireEvent.change(select, { target: { value: 'g2' } })

    await waitFor(() =>
      expect(window.api.notes.update).toHaveBeenCalledWith({ id: '3', groupId: 'g2' })
    )
    expect(screen.queryByTestId('editor')).toBeNull()
  })

  it('removes a note from its group with "No group"', async () => {
    window.api.notes.update = vi.fn(async () => ({
      ok: true as const,
      data: { ...note('1', 'Essay', null), contentJson: '[]' }
    }))
    render(<NotesPage />)
    const select = (await screen.findByLabelText('Group for Essay')) as HTMLSelectElement
    expect(select.value).toBe('g1')

    fireEvent.change(select, { target: { value: '' } })
    await waitFor(() =>
      expect(window.api.notes.update).toHaveBeenCalledWith({ id: '1', groupId: null })
    )
  })

  it('reloads the list after a move so a note leaves a filtered view', async () => {
    window.api.notes.update = vi.fn(async () => {
      all[0] = note('1', 'Essay', 'g2')
      return { ok: true as const, data: { ...all[0], contentJson: '[]' } }
    })
    render(<NotesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'School' }))
    const select = (await screen.findByLabelText('Group for Essay')) as HTMLSelectElement

    fireEvent.change(select, { target: { value: 'g2' } })

    await waitFor(() => expect(screen.queryByText('Essay')).toBeNull())
  })
})
