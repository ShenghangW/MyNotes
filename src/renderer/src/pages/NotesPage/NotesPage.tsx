import { useEffect, useState } from 'react'
import type { Note } from '@shared/api'
import { IconPlus, IconTrash } from '@renderer/components/icons'
import NoteEditor from './NoteEditor'

export default function NotesPage(): React.JSX.Element {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openNote, setOpenNote] = useState<Note | null>(null)

  const refresh = async (): Promise<void> => {
    setLoading(true)
    const result = await window.api.notes.list()
    if (result.ok) {
      setNotes(result.data)
      setError(null)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const handleCreate = async (): Promise<void> => {
    const result = await window.api.notes.create({})
    if (result.ok) {
      await refresh()
      setOpenNote(result.data)
      setError(null)
    } else {
      setError(result.error)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Delete this note?')) {
      return
    }
    const result = await window.api.notes.delete(id)
    if (result.ok) {
      setOpenNote(null)
      setError(null)
      await refresh()
    } else {
      setError(result.error)
    }
  }

  const handleSave = async (input: {
    id: string
    title: string
    contentJson: string
  }): Promise<void> => {
    const result = await window.api.notes.update(input)
    if (result.ok) {
      setOpenNote(result.data)
      setError(null)
      await refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <section className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-medium tracking-tight">Notes</h1>
        {!openNote ? (
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="flex h-9 items-center gap-2 rounded-sm border border-border bg-bg px-3 text-sm text-text hover:border-accent hover:text-accent"
          >
            <IconPlus /> New note
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mb-3 text-sm text-text">
          {error}
        </p>
      ) : null}

      {openNote ? (
        <NoteEditor
          note={openNote}
          onBack={() => setOpenNote(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : (
        <>
          {loading ? <p className="text-sm text-text-muted">Loading…</p> : null}
          {!loading && notes.length === 0 ? (
            <p className="text-sm text-text-muted">No notes yet. Create your first one.</p>
          ) : null}

          <ul className="flex flex-col gap-1">
            {notes.map((note) => (
              <li key={note.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onDoubleClick={() => setOpenNote(note)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') setOpenNote(note)
                  }}
                  className="group flex items-center justify-between rounded-sm border border-border px-3 py-2 hover:border-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{note.title}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleDelete(note.id)
                    }}
                    aria-label={`Delete ${note.title}`}
                    className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-sm text-text-muted hover:text-text group-hover:flex"
                  >
                    <IconTrash />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
