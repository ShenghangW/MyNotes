import { useCallback, useEffect, useRef, useState } from 'react'
import type { NoteGroup, NoteSummary, NotesFilter } from '@shared/api'
import { toAppImageUrl } from '@shared/imageUrl'
import { IconGrid, IconList, IconPlus, IconSearch, IconTrash } from '@renderer/components/icons'
import { useNoteGroups } from '@renderer/hooks/useNoteGroups'
import { useNotes } from '@renderer/hooks/useNotes'
import { cn } from '@renderer/lib/cn'
import NoteEditor from './NoteEditor'
import NoteGroupList, { type GroupSelection } from './NoteGroupList'

type ViewMode = 'grid' | 'list'

type NotesPageProps = {
  /** Set by the sidebar's "Add new note"; the page creates a note and opens it. */
  createRequested?: boolean
  onCreateHandled?: () => void
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
}

type NoteCardProps = {
  note: NoteSummary
  mode: ViewMode
  onOpen: (id: string) => void
  onDelete: (note: NoteSummary) => void
}

function NoteCard({ note, mode, onOpen, onDelete }: NoteCardProps): React.JSX.Element {
  return (
    <article
      tabIndex={0}
      aria-label={`Note: ${note.title}`}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-md border border-border bg-surface text-left hover:border-accent focus:border-accent focus:outline-none',
        mode === 'list' ? 'flex items-center gap-4 px-4 py-3' : 'flex flex-col'
      )}
      onDoubleClick={() => onOpen(note.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) {
          onOpen(note.id)
        }
      }}
    >
      {mode === 'grid' ? (
        note.coverImagePath ? (
          <img
            src={toAppImageUrl(note.coverImagePath)}
            alt=""
            className="h-24 w-full border-b border-border object-cover"
          />
        ) : (
          <div className="h-24 w-full border-b border-border bg-bg" aria-hidden />
        )
      ) : null}

      <div className={cn('min-w-0', mode === 'grid' ? 'p-3' : 'flex-1')}>
        <h2 className="truncate text-sm font-medium text-text">{note.title}</h2>
        <p
          className={cn(
            'mt-1 text-xs text-text-muted',
            mode === 'grid' ? 'line-clamp-3 min-h-[3rem]' : 'truncate'
          )}
        >
          {note.preview || 'No content yet'}
        </p>
      </div>

      <span className={cn('text-xs text-text-muted', mode === 'grid' ? 'px-3 pb-3' : 'shrink-0')}>
        {formatDate(note.updatedAt)}
      </span>

      <button
        type="button"
        aria-label={`Delete ${note.title}`}
        title="Delete note"
        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-surface text-text-muted opacity-0 hover:border-accent hover:text-accent focus:opacity-100 group-hover:opacity-100"
        onClick={(event) => {
          event.stopPropagation()
          onDelete(note)
        }}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <IconTrash className="h-4 w-4" />
      </button>
    </article>
  )
}

export default function NotesPage({
  createRequested = false,
  onCreateHandled
}: NotesPageProps): React.JSX.Element {
  const [selection, setSelection] = useState<GroupSelection>('all')
  const filter: NotesFilter =
    selection === 'all' ? {} : { groupId: selection === 'ungrouped' ? null : selection }
  const { notes, loading, error, query, setQuery, refresh, createNote, deleteNote } =
    useNotes(filter)
  const groupApi = useNoteGroups()
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  const [mode, setMode] = useState<ViewMode>('grid')
  const createHandledRef = useRef(false)

  const createAndOpen = useCallback(async (): Promise<void> => {
    // New notes inherit the group currently being viewed.
    const note = await createNote(filter.groupId)
    if (note) {
      setOpenNoteId(note.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNote, selection])

  useEffect(() => {
    if (!createRequested) {
      createHandledRef.current = false
      return
    }
    // Guard against React StrictMode running this effect twice.
    if (createHandledRef.current) {
      return
    }
    createHandledRef.current = true
    onCreateHandled?.()
    void createAndOpen()
  }, [createRequested, onCreateHandled, createAndOpen])

  const closeEditor = (): void => {
    setOpenNoteId(null)
    void refresh()
  }

  const handleDeleteGroup = async (group: NoteGroup): Promise<void> => {
    if (!window.confirm(`Delete group "${group.name}"? Its notes are kept and become ungrouped.`)) {
      return
    }
    if (await groupApi.deleteGroup(group.id)) {
      if (selection === group.id) {
        setSelection('all')
      }
      await refresh()
    }
  }

  const handleDelete = async (note: NoteSummary): Promise<void> => {
    if (window.confirm(`Delete "${note.title}"? This can't be undone.`)) {
      await deleteNote(note.id)
    }
  }

  if (openNoteId) {
    return (
      <NoteEditor
        key={openNoteId}
        noteId={openNoteId}
        onBack={closeEditor}
        onDeleted={closeEditor}
      />
    )
  }

  const searching = query.trim() !== ''

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[20px] font-medium tracking-tight">Notes</h1>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-border bg-surface px-3 text-sm text-text hover:border-accent hover:text-accent"
          onClick={() => void createAndOpen()}
        >
          <IconPlus className="h-4 w-4" />
          New note
        </button>
      </div>

      <div className="mt-4 flex gap-6">
        <NoteGroupList
          groups={groupApi.groups}
          selected={selection}
          error={groupApi.error}
          onSelect={(next) => {
            groupApi.clearError()
            setSelection(next)
          }}
          onCreate={groupApi.createGroup}
          onRename={groupApi.renameGroup}
          onDelete={(group) => void handleDeleteGroup(group)}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <label className="relative block max-w-sm flex-1">
              <span className="sr-only">Search notes</span>
              <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                value={query}
                placeholder="Search title and content"
                className="h-9 w-full rounded-sm border border-border bg-surface pr-3 pl-8 text-sm text-text outline-none placeholder:text-text-muted focus:border-accent"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <div className="flex gap-1" role="group" aria-label="View mode">
              {(
                [
                  ['grid', 'Grid view', IconGrid],
                  ['list', 'List view', IconList]
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  aria-pressed={mode === value}
                  title={label}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-sm border',
                    mode === value
                      ? 'border-accent text-accent'
                      : 'border-border text-text-muted hover:text-text'
                  )}
                  onClick={() => setMode(value)}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-text" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && !error && notes.length === 0 ? (
            <p className="mt-6 text-sm text-text-muted">
              {searching
                ? 'No notes match your search.'
                : selection === 'all'
                  ? 'No notes yet. Create your first one.'
                  : 'No notes in this view yet.'}
            </p>
          ) : null}

          <div
            className={cn(
              'mt-4',
              mode === 'grid'
                ? 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4'
                : 'flex flex-col gap-2'
            )}
          >
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                mode={mode}
                onOpen={setOpenNoteId}
                onDelete={(target) => void handleDelete(target)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
