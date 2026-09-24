import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NotesPage from './NotesPage'
import { createMockApi } from '../../../../test/mockApi'
import type { Note } from '@shared/api'

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Java programming basics',
    contentJson: 'string, int, and double',
    groupId: null,
    coverImagePath: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('NotesPage (basic CRUD)', () => {
  it('lists notes returned by the API', async () => {
    window.api = createMockApi({
      notes: {
        list: async () => ({ ok: true, data: [makeNote()] }),
        get: async () => ({ ok: false, error: 'unused' }),
        create: async () => ({ ok: false, error: 'unused' }),
        update: async () => ({ ok: false, error: 'unused' }),
        delete: async () => ({ ok: true, data: null }),
        search: async () => ({ ok: false, error: 'unused' }),
        setCover: async () => ({ ok: false, error: 'unused' }),
        clearCover: async () => ({ ok: false, error: 'unused' })
      }
    })

    render(<NotesPage />)

    expect(screen.getByRole('heading', { name: 'Notes' })).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText('Java programming basics')).toBeTruthy()
    })
  })

  it('creates a note and opens it for editing', async () => {
    const created = makeNote({ id: 'note-2', title: 'Untitled', contentJson: '' })

    window.api = createMockApi({
      notes: {
        list: async () => ({ ok: true, data: [] }),
        get: async () => ({ ok: false, error: 'unused' }),
        create: async () => ({ ok: true, data: created }),
        update: async () => ({ ok: false, error: 'unused' }),
        delete: async () => ({ ok: true, data: null }),
        search: async () => ({ ok: false, error: 'unused' }),
        setCover: async () => ({ ok: false, error: 'unused' }),
        clearCover: async () => ({ ok: false, error: 'unused' })
      }
    })

    render(<NotesPage />)
    await waitFor(() => expect(screen.getByText('No notes yet. Create your first one.')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'New note' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Untitled')).toBeTruthy()
      expect(screen.getByPlaceholderText('Start writing…')).toBeTruthy()
    })
  })

  it('deletes a note after confirmation', async () => {
    const deleteFn = vi.fn(async () => ({ ok: true as const, data: null }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    window.api = createMockApi({
      notes: {
        list: async () => ({ ok: true, data: [makeNote()] }),
        get: async () => ({ ok: false, error: 'unused' }),
        create: async () => ({ ok: false, error: 'unused' }),
        update: async () => ({ ok: false, error: 'unused' }),
        delete: deleteFn,
        search: async () => ({ ok: false, error: 'unused' }),
        setCover: async () => ({ ok: false, error: 'unused' }),
        clearCover: async () => ({ ok: false, error: 'unused' })
      }
    })

    render(<NotesPage />)
    await waitFor(() => expect(screen.getByText('Java programming basics')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Delete Java programming basics' }))

    await waitFor(() => expect(deleteFn).toHaveBeenCalledWith('note-1'))
  })
})
