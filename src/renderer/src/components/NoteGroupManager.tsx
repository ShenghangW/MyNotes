import { useState } from 'react'
import InlineNameInput from '@renderer/components/InlineNameInput'
import { IconPencil, IconPlus, IconTrash } from '@renderer/components/icons'
import { useNoteGroups } from '@renderer/hooks/useNoteGroups'

/** Group management for the Settings page (same hook as the Notes sidebar). */
export default function NoteGroupManager(): React.JSX.Element {
  const { groups, loading, error, clearError, createGroup, renameGroup, deleteGroup } =
    useNoteGroups()
  const [creating, setCreating] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)

  const handleDelete = (id: string, name: string): void => {
    if (window.confirm(`Delete group "${name}"? Its notes are kept and become ungrouped.`)) {
      void deleteGroup(id)
    }
  }

  return (
    <div data-testid="group-manager">
      {!loading && groups.length === 0 ? (
        <p className="text-sm text-text-muted">No groups yet.</p>
      ) : null}

      <ul className="space-y-1">
        {groups.map((group) => (
          <li key={group.id} className="flex items-center gap-2">
            {renamingId === group.id ? (
              <div className="max-w-xs flex-1">
                <InlineNameInput
                  label={`Rename group ${group.name}`}
                  initialValue={group.name}
                  onSubmit={(name) => renameGroup(group.id, name)}
                  onCancel={() => setRenamingId(null)}
                />
              </div>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-sm text-text">{group.name}</span>
                <button
                  type="button"
                  aria-label={`Rename group ${group.name}`}
                  title="Rename group"
                  className="flex h-7 w-7 items-center justify-center rounded-sm text-text-muted hover:text-accent"
                  onClick={() => {
                    clearError()
                    setRenamingId(group.id)
                  }}
                >
                  <IconPencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete group ${group.name}`}
                  title="Delete group"
                  className="flex h-7 w-7 items-center justify-center rounded-sm text-text-muted hover:text-accent"
                  onClick={() => handleDelete(group.id, group.name)}
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 max-w-xs">
        {creating ? (
          <InlineNameInput
            label="New group name"
            placeholder="Group name"
            onSubmit={createGroup}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-bg px-2.5 text-sm text-text hover:border-accent hover:text-accent"
            onClick={() => {
              clearError()
              setCreating(true)
            }}
          >
            <IconPlus className="h-4 w-4" />
            New group
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
