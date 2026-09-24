import { useState } from 'react'
import type { Note } from '@shared/api'
import { IconChevronLeft } from '@renderer/components/icons'

type NoteEditorProps = {
  note: Note
  onBack: () => void
  onSave: (input: { id: string; title: string; contentJson: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const buttonClass =
  'flex h-9 items-center gap-2 rounded-sm border border-border bg-bg px-3 text-sm text-text hover:border-accent hover:text-accent disabled:opacity-60'

/**
 * Basic plain-text editor for Phase 3's first slice. This will be replaced by
 * the BlockNote rich-text editor (formatting, foldable headings, images) in a
 * later slice — content is stored as plain text in `contentJson` until then.
 */
export default function NoteEditor({
  note,
  onBack,
  onSave,
  onDelete
}: NoteEditorProps): React.JSX.Element {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.contentJson)
  const [saving, setSaving] = useState(false)

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      await onSave({ id: note.id, title, contentJson: content })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <IconChevronLeft /> Back to notes
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => void onDelete(note.id)} className={buttonClass}>
            Delete
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className={buttonClass}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Untitled"
        className="mb-3 w-full border-none bg-transparent text-2xl font-semibold text-text outline-none placeholder:text-text-muted"
      />

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Start writing…"
        className="min-h-[300px] flex-1 resize-none border-none bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
      />
    </div>
  )
}
