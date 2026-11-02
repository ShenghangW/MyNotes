import { useNotes } from '@renderer/hooks/useNotes'
import { formatShortDate } from '@renderer/lib/date'

const RECENT_COUNT = 5

type RecentNotesWidgetProps = { onOpenNote?: (id: string) => void }

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
      className="lg-glass rounded-md p-4"
    >
      <h2 id="recent-notes-heading" className="text-sm font-medium text-text">
        Recent notes
      </h2>
      {recent.length === 0 ? (
        <p className="lg-text-2 mt-3 text-sm">
          {loading ? 'Loading…' : 'No notes yet. Use “Add new note” to start one.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {recent.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                className="flex w-full items-baseline gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-hover"
                onClick={() => onOpenNote?.(note.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text">{note.title}</span>
                  {note.preview ? (
                    <span className="lg-text-2 block truncate text-xs">{note.preview}</span>
                  ) : null}
                </span>
                <span className="lg-text-2 shrink-0 text-xs">
                  {formatShortDate(note.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
