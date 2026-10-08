import { useState } from 'react'
import type { NoteGroup } from '@shared/api'
import InlineNameInput from '@renderer/components/InlineNameInput'
import { IconPencil, IconPlus, IconTrash } from '@renderer/components/icons'
import { cn } from '@renderer/lib/cn'

/** 'all' | 'ungrouped' | a group id */
export type GroupSelection = string

type NoteGroupListProps = {
  groups: NoteGroup[]
  selected: GroupSelection
  error: string | null
  onSelect: (selection: GroupSelection) => void
  onCreate: (name: string) => Promise<boolean>
  onRename: (id: string, name: string) => Promise<boolean>
  onDelete: (group: NoteGroup) => void
}

const rowClass = (active: boolean): string =>
  cn(
    'flex h-8 min-w-0 flex-1 items-center rounded-sm px-2 text-left text-sm',
    active
      ? 'bg-surface font-medium text-accent'
      : 'text-text-muted hover:bg-surface hover:text-text'
  )

const iconButtonClass =
  'flex h-6 w-6 items-center justify-center rounded-sm text-text-muted opacity-0 hover:text-accent focus:opacity-100 group-hover:opacity-100'

export default function NoteGroupList({
  groups,
  selected,
  error,
  onSelect,
  onCreate,
  onRename,
  onDelete
}: NoteGroupListProps): React.JSX.Element {
  const [creating, setCreating] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)

  return (
    <nav aria-label="Note groups" className="w-44 shrink-0">
      <div className="flex flex-col gap-0.5">
        <div className="flex">
          <button
            type="button"
            aria-pressed={selected === 'all'}
            className={rowClass(selected === 'all')}
            onClick={() => onSelect('all')}
          >
            All notes
          </button>
        </div>
        <div className="flex">
          <button
            type="button"
            aria-pressed={selected === 'ungrouped'}
            className={rowClass(selected === 'ungrouped')}
            onClick={() => onSelect('ungrouped')}
          >
            Ungrouped
          </button>
        </div>

        {groups.map((group) =>
          renamingId === group.id ? (
            <InlineNameInput
              key={group.id}
              label={`Rename group ${group.name}`}
              initialValue={group.name}
              onSubmit={(name) => onRename(group.id, name)}
              onCancel={() => setRenamingId(null)}
            />
          ) : (
            <div key={group.id} className="group flex items-center">
              <button
                type="button"
                aria-pressed={selected === group.id}
                className={rowClass(selected === group.id)}
                onClick={() => onSelect(group.id)}
              >
                <span className="truncate">{group.name}</span>
              </button>
              <button
                type="button"
                aria-label={`Rename group ${group.name}`}
                title="Rename group"
                className={iconButtonClass}
                onClick={() => setRenamingId(group.id)}
              >
                <IconPencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Delete group ${group.name}`}
                title="Delete group"
                className={iconButtonClass}
                onClick={() => onDelete(group)}
              >
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        )}
      </div>

      <div className="mt-3">
        {creating ? (
          <InlineNameInput
            label="New group name"
            placeholder="Group name"
            onSubmit={onCreate}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-sm px-2 text-sm text-text-muted hover:bg-surface hover:text-accent"
            onClick={() => setCreating(true)}
          >
            <IconPlus className="h-4 w-4" />
            New group
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-text" role="alert">
          {error}
        </p>
      ) : null}
    </nav>
  )
}
