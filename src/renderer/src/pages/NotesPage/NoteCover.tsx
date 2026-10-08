import { useState } from 'react'
import type { Note } from '@shared/api'
import { toAppImageUrl } from '@shared/imageUrl'
import { IconImage, IconTrash } from '@renderer/components/icons'
import { errorMessage, unwrap } from '@renderer/lib/ipc'

type NoteCoverProps = {
  noteId: string
  coverImagePath: string | null
  onChange: (note: Note) => void
}

const buttonClass =
  'inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-xs text-text-muted hover:border-accent hover:text-accent'

export default function NoteCover({
  noteId,
  coverImagePath,
  onChange
}: NoteCoverProps): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickCover = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      // File picker runs in the main process; it copies the image into app data.
      const relative = unwrap(await window.api.images.saveFromPath())
      if (relative) {
        onChange(unwrap(await window.api.notes.setCover({ id: noteId, coverImagePath: relative })))
      }
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const removeCover = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      onChange(unwrap(await window.api.notes.clearCover({ id: noteId })))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="group relative">
      {coverImagePath ? (
        <img
          src={toAppImageUrl(coverImagePath)}
          alt="Note cover"
          className="h-48 w-full rounded-md border border-border object-cover"
        />
      ) : null}

      <div
        className={
          coverImagePath
            ? 'absolute right-3 bottom-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100'
            : 'flex gap-2'
        }
      >
        <button type="button" className={buttonClass} disabled={busy} onClick={pickCover}>
          <IconImage className="h-4 w-4" />
          {coverImagePath ? 'Change cover' : 'Add cover'}
        </button>
        {coverImagePath ? (
          <button type="button" className={buttonClass} disabled={busy} onClick={removeCover}>
            <IconTrash className="h-4 w-4" />
            Remove cover
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
