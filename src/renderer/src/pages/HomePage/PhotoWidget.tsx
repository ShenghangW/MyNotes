import { useState } from 'react'
import type { SettingsPatch } from '@shared/api'
import { toAppImageUrl } from '@shared/imageUrl'
import { IconImage, IconTrash } from '@renderer/components/icons'
import { errorMessage, unwrap } from '@renderer/lib/ipc'

type PhotoWidgetProps = {
  photoPath: string | null
  visible: boolean
  /** Saves a settings change; resolves false if it failed. */
  onChange: (patch: SettingsPatch) => Promise<boolean>
}

const buttonClass =
  'inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-xs text-text-muted hover:border-accent hover:text-accent disabled:opacity-40'

/** One photo on the Home page. Hiding it keeps the file; removing it deletes the file. */
export default function PhotoWidget({
  photoPath,
  visible,
  onChange
}: PhotoWidgetProps): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const pick = (): Promise<void> =>
    run(async () => {
      // The file picker runs in the main process; it copies the image into app data.
      const relative = unwrap(await window.api.images.saveFromPath())
      if (relative) {
        await onChange({ homePhotoPath: relative, homePhotoVisible: true })
      }
    })

  return (
    <section aria-label="Photo" className="rounded-md border border-border bg-surface p-4">
      {photoPath && visible ? (
        <div className="group relative">
          <img
            src={toAppImageUrl(photoPath)}
            alt="Home"
            className="max-h-64 w-full rounded-sm object-cover"
          />
          <div className="absolute right-2 bottom-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => void pick()}
            >
              <IconImage className="h-4 w-4" />
              Change
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => void run(() => onChange({ homePhotoVisible: false }))}
            >
              Hide
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => void run(() => onChange({ homePhotoPath: null }))}
            >
              <IconTrash className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>
      ) : photoPath ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-text-muted">Photo hidden</span>
          <button
            type="button"
            className={buttonClass}
            disabled={busy}
            onClick={() => void run(() => onChange({ homePhotoVisible: true }))}
          >
            Show photo
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-text-muted">No photo yet</span>
          <button type="button" className={buttonClass} disabled={busy} onClick={() => void pick()}>
            <IconImage className="h-4 w-4" />
            Add photo
          </button>
        </div>
      )}
      {error ? (
        <p className="mt-2 text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
