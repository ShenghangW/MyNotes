import { useRef, useState } from 'react'
import { IconPencil } from '@renderer/components/icons'

type EditableTitleProps = {
  value: string
  /** Called with the trimmed new title; return false to keep editing (e.g. save failed). */
  onSave: (title: string) => Promise<boolean> | boolean
  maxLength?: number
}

const HEADING_STYLE = 'text-[20px] font-medium tracking-tight'

/** A page heading you can click to rename. Enter or clicking away saves, Escape cancels. */
export default function EditableTitle({
  value,
  onSave,
  maxLength = 60
}: EditableTitleProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  // Guards against Escape/Enter being followed by a blur that would save a second time.
  const finishedRef = useRef(false)

  const startEditing = (): void => {
    setDraft(value)
    finishedRef.current = false
    setEditing(true)
  }

  const commit = async (): Promise<void> => {
    if (finishedRef.current) {
      return
    }
    const next = draft.trim()
    // A blank title falls back to the default on the saving side, so let it through.
    if (next === value) {
      finishedRef.current = true
      setEditing(false)
      return
    }
    finishedRef.current = true
    if (await onSave(next)) {
      setEditing(false)
    } else {
      finishedRef.current = false
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        aria-label="Page title"
        value={draft}
        maxLength={maxLength}
        className={`${HEADING_STYLE} h-9 w-full max-w-xl rounded-sm border border-accent bg-surface px-2 text-text outline-none`}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void commit()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            finishedRef.current = true
            setEditing(false)
          }
        }}
        onBlur={() => void commit()}
      />
    )
  }

  return (
    <div className="group flex items-center gap-2">
      <h1
        className={`${HEADING_STYLE} cursor-text rounded-sm`}
        title="Click to rename"
        onClick={startEditing}
      >
        {value}
      </h1>
      <button
        type="button"
        aria-label="Rename page title"
        title="Rename"
        className="flex h-7 w-7 items-center justify-center rounded-sm text-text-muted opacity-0 hover:text-accent focus:opacity-100 group-hover:opacity-100"
        onClick={startEditing}
      >
        <IconPencil className="h-4 w-4" />
      </button>
    </div>
  )
}
