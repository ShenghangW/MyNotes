import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import {
  FilePanel,
  FilePanelController,
  SideMenu,
  SideMenuController,
  AddBlockButton,
  DragHandleButton,
  UploadTab,
  useCreateBlockNote,
  type FilePanelProps
} from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import type { Note } from '@shared/api'
import { toAppImageUrl } from '@shared/imageUrl'
import { IconArrowLeft, IconTrash } from '@renderer/components/icons'
import { useAutosave, type SaveStatus } from '@renderer/hooks/useAutosave'
import { useNoteGroups } from '@renderer/hooks/useNoteGroups'
import { errorMessage, unwrap } from '@renderer/lib/ipc'
import NoteCover from './NoteCover'
import { NoteDragHandleMenu } from './NoteBlockMenu'

// V1 scope (PRD): no tables, code blocks, or video/audio. Removing the block specs also
// removes their slash-menu entries.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { table, codeBlock, video, audio, file, ...allowedBlocks } = defaultBlockSpecs
const noteSchema = BlockNoteSchema.create({ blockSpecs: allowedBlocks })

type NotePatch = { title: string; contentJson: string; groupId: string | null }

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  pending: 'Unsaved changes…',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Could not save'
}

function parseInitialContent(contentJson: string): never[] | undefined {
  try {
    const parsed: unknown = JSON.parse(contentJson)
    // BlockNote rejects an empty initialContent; undefined gives a fresh empty doc.
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as never[]) : undefined
  } catch {
    return undefined
  }
}

/** Inline images are picked from disk only; remote embeds would be blocked by the CSP anyway. */
function UploadOnlyFilePanel(props: FilePanelProps): React.JSX.Element {
  return (
    <FilePanel
      {...props}
      tabs={[
        {
          name: 'Upload',
          tabPanel: <UploadTab blockId={props.blockId} setLoading={() => undefined} />
        }
      ]}
    />
  )
}

async function uploadInlineImage(file: File): Promise<string> {
  const sourcePath = window.api.images.pathForFile(file)
  if (!sourcePath) {
    throw new Error(
      'Only image files from your computer can be added (pasted images are not supported yet).'
    )
  }
  const relative = unwrap(await window.api.images.saveFromPath(sourcePath))
  if (!relative) {
    throw new Error('The image could not be saved.')
  }
  return toAppImageUrl(relative)
}

type LoadedProps = {
  note: Note
  onBack: () => void
  onDeleted: () => void
}

function LoadedNoteEditor({ note, onBack, onDeleted }: LoadedProps): React.JSX.Element {
  const [title, setTitle] = useState(note.title)
  const [coverImagePath, setCoverImagePath] = useState(note.coverImagePath)
  const [groupId, setGroupId] = useState(note.groupId)
  const { groups } = useNoteGroups()
  const [actionError, setActionError] = useState<string | null>(null)

  const save = useCallback(
    async (patch: NotePatch): Promise<void> => {
      unwrap(await window.api.notes.update({ id: note.id, ...patch }))
    },
    [note.id]
  )
  const { schedule, flush, status, error: saveError } = useAutosave<NotePatch>(save)

  const initialContent = useMemo(() => parseInitialContent(note.contentJson), [note.contentJson])
  const editor = useCreateBlockNote(
    { schema: noteSchema, initialContent, uploadFile: uploadInlineImage },
    []
  )

  // Skip saves when BlockNote reports a change that leaves the document identical.
  const lastContentRef = useRef(note.contentJson)
  const handleEditorChange = (): void => {
    const next = JSON.stringify(editor.document)
    if (next !== lastContentRef.current) {
      lastContentRef.current = next
      schedule({ contentJson: next })
    }
  }

  const handleTitleChange = (value: string): void => {
    setTitle(value)
    schedule({ title: value })
  }

  const handleGroupChange = (value: string): void => {
    const next = value === '' ? null : value
    setGroupId(next)
    schedule({ groupId: next })
  }

  const handleTitleBlur = (): void => {
    if (title.trim() === '') {
      setTitle('Untitled')
      schedule({ title: 'Untitled' })
    }
  }

  // Ctrl/Cmd+S is handled app-wide by SaveIndicator, which flushes this editor's autosave.

  const handleBack = async (): Promise<void> => {
    await flush()
    onBack()
  }

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm(`Delete "${title.trim() || 'Untitled'}"? This can't be undone.`)) {
      return
    }
    try {
      await flush()
      unwrap(await window.api.notes.delete({ id: note.id }))
      onDeleted()
    } catch (caught) {
      setActionError(errorMessage(caught))
    }
  }

  const statusLabel = STATUS_LABEL[status]

  return (
    <section className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-sm text-text-muted hover:bg-surface hover:text-text"
          onClick={() => void handleBack()}
        >
          <IconArrowLeft className="h-4 w-4" />
          Back to notes
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted" aria-live="polite" data-testid="save-status">
            {statusLabel}
          </span>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-xs text-text-muted hover:border-accent hover:text-accent"
            onClick={() => void handleDelete()}
          >
            <IconTrash className="h-4 w-4" />
            Delete note
          </button>
        </div>
      </div>

      {saveError || actionError ? (
        <p className="text-sm text-text" role="alert">
          {actionError ?? saveError}
        </p>
      ) : null}

      <NoteCover
        noteId={note.id}
        coverImagePath={coverImagePath}
        onChange={(updated) => setCoverImagePath(updated.coverImagePath)}
      />

      <input
        type="text"
        aria-label="Note title"
        value={title}
        placeholder="Untitled"
        className="w-full border-0 bg-transparent px-[54px] text-[32px] font-semibold tracking-tight text-text outline-none placeholder:text-text-muted"
        onChange={(event) => handleTitleChange(event.target.value)}
        onFocus={(event) => {
          if (title === 'Untitled') {
            event.target.select()
          }
        }}
        onBlur={handleTitleBlur}
      />

      <label className="flex items-center gap-2 px-[54px] text-sm text-text-muted">
        Group
        <select
          aria-label="Note group"
          value={groupId ?? ''}
          className="h-8 rounded-sm border border-border bg-surface px-2 text-sm text-text outline-none focus:border-accent"
          onChange={(event) => handleGroupChange(event.target.value)}
        >
          <option value="">No group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>

      <div
        className="mn-note-surface min-h-[50vh] flex-1 rounded-md bg-surface py-3"
        onMouseDown={(event) => {
          // Clicking the empty space below the text puts the cursor at the end, like a real page.
          if (
            event.target === event.currentTarget ||
            (event.target as HTMLElement).classList.contains('bn-container')
          ) {
            event.preventDefault()
            editor.focus()
          }
        }}
      >
        <BlockNoteView
          editor={editor}
          theme="light"
          filePanel={false}
          sideMenu={false}
          onChange={handleEditorChange}
        >
          <FilePanelController filePanel={UploadOnlyFilePanel} />
          <SideMenuController
            sideMenu={(props) => (
              <SideMenu {...props}>
                <AddBlockButton />
                <DragHandleButton {...props} dragHandleMenu={NoteDragHandleMenu} />
              </SideMenu>
            )}
          />
        </BlockNoteView>
      </div>
    </section>
  )
}

type NoteEditorProps = {
  noteId: string
  onBack: () => void
  onDeleted: () => void
}

export default function NoteEditor({
  noteId,
  onBack,
  onDeleted
}: NoteEditorProps): React.JSX.Element {
  const [note, setNote] = useState<Note | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const loaded = unwrap(await window.api.notes.get({ id: noteId }))
        if (!cancelled) {
          setNote(loaded)
        }
      } catch (caught) {
        if (!cancelled) {
          setError(errorMessage(caught))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [noteId])

  if (error) {
    return (
      <section className="flex flex-col items-start gap-3">
        <p className="text-sm text-text" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-sm text-text hover:border-accent hover:text-accent"
          onClick={onBack}
        >
          <IconArrowLeft className="h-4 w-4" />
          Back to notes
        </button>
      </section>
    )
  }

  if (!note) {
    return <p className="text-sm text-text-muted">Loading…</p>
  }

  return <LoadedNoteEditor key={note.id} note={note} onBack={onBack} onDeleted={onDeleted} />
}
