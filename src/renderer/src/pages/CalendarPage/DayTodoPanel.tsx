import { useState } from 'react'
import type { Todo } from '@shared/api'
import { IconPlus, IconTrash } from '@renderer/components/icons'
import { cn } from '@renderer/lib/cn'
import { formatDueDate } from '@renderer/lib/date'

type DayTodoPanelProps = {
  /** The day being shown (YYYY-MM-DD). */
  date: string
  todos: Todo[]
  error: string | null
  onAdd: (text: string, dueDate: string) => Promise<boolean>
  onUpdate: (patch: {
    id: string
    text?: string
    done?: boolean
    dueDate?: string | null
  }) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

/** To-dos due on the open day, fully editable — the same list as on Home. */
export default function DayTodoPanel({
  date,
  todos,
  error,
  onAdd,
  onUpdate,
  onDelete
}: DayTodoPanelProps): React.JSX.Element {
  const [text, setText] = useState('')
  const dayTodos = todos.filter((todo) => todo.dueDate === date)

  const add = async (): Promise<void> => {
    if (text.trim() === '') {
      return
    }
    if (await onAdd(text, date)) {
      setText('')
    }
  }

  return (
    <aside
      aria-label="To-dos for this day"
      className="flex w-80 shrink-0 flex-col rounded-md border border-border bg-surface p-4"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-text">To-do · {formatDueDate(date)}</h2>
        <span className="text-xs text-text-muted">
          {dayTodos.filter((todo) => !todo.done).length} remaining
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          aria-label="New to-do for this day"
          value={text}
          maxLength={300}
          placeholder="Add a to-do for this day"
          className="h-9 min-w-0 flex-1 rounded-sm border border-border bg-bg px-3 text-sm text-text outline-none placeholder:text-text-muted focus:border-accent"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void add()
            }
          }}
        />
        <button
          type="button"
          aria-label="Add to-do for this day"
          disabled={text.trim() === ''}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-bg text-text hover:border-accent hover:text-accent disabled:opacity-40"
          onClick={() => void add()}
        >
          <IconPlus className="h-4 w-4" />
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}

      {dayTodos.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Nothing due on this day.</p>
      ) : null}

      <ul className="mt-3 flex-1 divide-y divide-border overflow-auto">
        {dayTodos.map((todo) => (
          <li key={todo.id} className="group flex items-start gap-2 py-2">
            <input
              type="checkbox"
              aria-label={`Mark "${todo.text}" as done`}
              checked={todo.done}
              className="mt-1 h-4 w-4 shrink-0 accent-accent"
              onChange={(event) => void onUpdate({ id: todo.id, done: event.target.checked })}
            />
            <div className="min-w-0 flex-1">
              <input
                // Re-mount when the saved text changes so the field never shows stale text.
                key={todo.text}
                type="text"
                aria-label={`Edit "${todo.text}"`}
                defaultValue={todo.text}
                maxLength={300}
                className={cn(
                  'w-full rounded-sm border border-transparent bg-transparent px-1 text-sm outline-none focus:border-accent',
                  todo.done ? 'text-text-muted line-through' : 'text-text'
                )}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur()
                  } else if (event.key === 'Escape') {
                    event.currentTarget.value = todo.text
                    event.currentTarget.blur()
                  }
                }}
                onBlur={(event) => {
                  const next = event.currentTarget.value.trim()
                  if (next === '') {
                    event.currentTarget.value = todo.text
                  } else if (next !== todo.text) {
                    void onUpdate({ id: todo.id, text: next })
                  }
                }}
              />
              <input
                type="date"
                aria-label={`Due date for "${todo.text}"`}
                value={todo.dueDate ?? ''}
                className="mt-0.5 h-6 rounded-sm border border-transparent bg-transparent px-1 text-xs text-text-muted outline-none hover:border-border focus:border-accent"
                onChange={(event) =>
                  void onUpdate({ id: todo.id, dueDate: event.target.value || null })
                }
              />
            </div>
            <button
              type="button"
              aria-label={`Delete "${todo.text}"`}
              title="Delete to-do"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-text-muted opacity-0 hover:text-accent focus:opacity-100 group-hover:opacity-100"
              onClick={() => void onDelete(todo.id)}
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
