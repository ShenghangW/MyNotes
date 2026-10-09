import { useNotes } from '@renderer/hooks/useNotes'

const RECENT_COUNT = 5

type RecentNotesWidgetProps = { onOpenNote?: (id: string) => void }

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
}

/** The notes you touched most recently, newest first. Click one to jump back into it. */
export default function RecentNotesWidget({
  onOpenNote
}: RecentNotesWidgetProps): React.JSX.Element {
  const { notes, loading } = useNotes()
  const recent = [...notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, RECENT_COUNT)

  return (
    <section
      aria-labelledby="recent-notes-heading"
      className="rounded-md border border-border bg-surface p-4"
    >
      <h2 id="recent-notes-heading" className="text-sm font-medium text-text">
        Recent notes
      </h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">
          {loading ? 'Loading…' : 'No notes yet. Use “Add new note” to start one.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {recent.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                className="flex w-full items-baseline gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-bg"
                onClick={() => onOpenNote?.(note.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text">{note.title}</span>
                  {note.preview ? (
                    <span className="block truncate text-xs text-text-muted">{note.preview}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-text-muted">
                  {formatDate(note.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
