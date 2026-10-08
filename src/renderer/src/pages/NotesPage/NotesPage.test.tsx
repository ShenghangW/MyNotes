import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NoteSummary } from '@shared/api'
import { createMockApi } from '../../../../test/mockApi'
import NotesPage from './NotesPage'

// BlockNote needs a real browser layout engine; the editor is covered by manual QA.
vi.mock('./NoteEditor', () => ({
  default: ({ noteId, onBack }: { noteId: string; onBack: () => void }) => (
    <div>
      <p data-testid="editor">editing {noteId}</p>
      <button type="button" onClick={onBack}>
        Back to notes
      </button>
    </div>
  )
}))

function summary(id: string, title: string, preview = ''): NoteSummary {
  return {
    id,
    title,
    preview,
    groupId: null,
    coverImagePath: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  }
}

describe('NotesPage', () => {
  const alpha = summary('1', 'Alpha', 'first body')
  const beta = summary('2', 'Beta', 'mentions mitochondria')

  beforeEach(() => {
    const base = createMockApi()
    window.api = createMockApi({
      notes: {
        ...base.notes,
        list: vi.fn(async () => ({ ok: true as const, data: [alpha, beta] })),
        search: vi.fn(async ({ query }: { query: string }) => ({
          ok: true as const,
          data: [alpha, beta].filter((n) => n.preview.includes(query))
        })),
        create: vi.fn(async () => ({
          ok: true as const,
          data: { ...summary('3', 'Untitled'), contentJson: '[]' }
        })),
        delete: vi.fn(async () => ({ ok: true as const, data: null }))
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists notes with titles and previews', async () => {
    render(<NotesPage />)
    expect(await screen.findByText('Alpha')).toBeTruthy()
    expect(screen.getByText('mentions mitochondria')).toBeTruthy()
  })

  it('opens a note in the editor on double-click and returns to the list', async () => {
    render(<NotesPage />)
    fireEvent.doubleClick(await screen.findByText('Beta'))
    expect((await screen.findByTestId('editor')).textContent).toBe('editing 2')

    fireEvent.click(screen.getByRole('button', { name: 'Back to notes' }))
    expect(await screen.findByText('Alpha')).toBeTruthy()
  })

  it('searches through the notes API and shows only matches', async () => {
    render(<NotesPage />)
    await screen.findByText('Alpha')

    fireEvent.change(screen.getByPlaceholderText('Search title and content'), {
      target: { value: 'mitochondria' }
    })

    await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull())
    expect(screen.getByText('Beta')).toBeTruthy()
    expect(window.api.notes.search).toHaveBeenCalledWith({ query: 'mitochondria' })
  })

  it('creates a note and opens it immediately', async () => {
    render(<NotesPage />)
    await screen.findByText('Alpha')

    fireEvent.click(screen.getByRole('button', { name: 'New note' }))
    expect((await screen.findByTestId('editor')).textContent).toBe('editing 3')
  })

  it('creates exactly one note when the sidebar requests it', async () => {
    const onHandled = vi.fn()
    render(<NotesPage createRequested onCreateHandled={onHandled} />)

    expect((await screen.findByTestId('editor')).textContent).toBe('editing 3')
    expect(window.api.notes.create).toHaveBeenCalledTimes(1)
    expect(onHandled).toHaveBeenCalledTimes(1)
  })

  it('deletes a note after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<NotesPage />)
    await screen.findByText('Alpha')

    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }))
    await waitFor(() => expect(window.api.notes.delete).toHaveBeenCalledWith({ id: '1' }))
  })

  it('keeps the note when deletion is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<NotesPage />)
    await screen.findByText('Alpha')

    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }))
    expect(window.api.notes.delete).not.toHaveBeenCalled()
  })
})
