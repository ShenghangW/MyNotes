import { useState } from 'react'
import { IconChevronDown, IconPlus, IconTrash } from '@renderer/components/icons'
import { usePersistedFlag } from '@renderer/hooks/usePersistedFlag'
import { useTodos } from '@renderer/hooks/useTodos'
import { cn } from '@renderer/lib/cn'
import { formatDueDate, isOverdue, toLocalIsoDate } from '@renderer/lib/date'

/** How many to-dos Home shows until the list is expanded. */
export const COLLAPSED_COUNT = 5

export default function TodoWidget(): React.JSX.Element {
  const { todos, loading, error, addTodo, updateTodo, deleteTodo } = useTodos()
  const [text, setText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [folded, toggleFolded] = usePersistedFlag('home.todo.folded', false)

  const today = toLocalIsoDate()
  const remaining = todos.filter((todo) => !todo.done).length

  const handleAdd = async (): Promise<void> => {
    if (text.trim() === '') {
      return
    }
    if (await addTodo(text, dueDate || null)) {
      setText('')
      setDueDate('')
      setFormOpen(false)
    }
  }

  const closeForm = (): void => {
    setFormOpen(false)
    setText('')
    setDueDate('')
  }

  const visibleTodos = expanded ? todos : todos.slice(0, COLLAPSED_COUNT)
  const hiddenCount = todos.length - visibleTodos.length

  return (
    <section
      aria-labelledby="todo-heading"
      className="rounded-md border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={folded ? 'Unfold to-do list' : 'Fold to-do list'}
            title={folded ? 'Unfold' : 'Fold'}
            aria-expanded={!folded}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-text-muted hover:text-accent"
            onClick={toggleFolded}
          >
            <IconChevronDown
              className={cn('h-4 w-4 transition-transform', !folded && 'rotate-180')}
            />
          </button>
          <h2 id="todo-heading" className="text-sm font-medium text-text">
            To-do
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted" data-testid="todo-remaining">
            {remaining} remaining
          </span>
          <button
            type="button"
            aria-label="Add to-do"
            title="Add to-do"
            aria-expanded={formOpen}
            className="flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-bg text-text hover:border-accent hover:text-accent"
            onClick={() => {
              if (folded) {
                // Adding something should show the list again.
                toggleFolded()
                setFormOpen(true)
              } else if (formOpen) {
                closeForm()
              } else {
                setFormOpen(true)
              }
            }}
          >
            <IconPlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!folded && formOpen ? (
        <div
          className="mt-3 flex flex-wrap items-center gap-2"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              closeForm()
            }
          }}
        >
          <input
            autoFocus
            type="text"
            aria-label="New to-do"
            value={text}
            placeholder="Add a to-do"
            maxLength={300}
            className="h-9 min-w-0 flex-1 basis-48 rounded-sm border border-border bg-bg px-3 text-sm text-text outline-none placeholder:text-text-muted focus:border-accent"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleAdd()
              }
            }}
          />
          <input
            type="date"
            aria-label="Due date (optional)"
            value={dueDate}
            className="h-9 rounded-sm border border-border bg-bg px-2 text-sm text-text outline-none focus:border-accent"
            onChange={(event) => setDueDate(event.target.value)}
          />
          <button
            type="button"
            disabled={text.trim() === ''}
            className="h-9 rounded-sm bg-accent px-3 text-sm text-white disabled:opacity-40"
            onClick={() => void handleAdd()}
          >
            Save
          </button>
          <button
            type="button"
            className="h-9 rounded-sm px-2 text-sm text-text-muted hover:text-text"
            onClick={closeForm}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {!folded && error ? (
        <p className="mt-2 text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}

      {!folded && !loading && todos.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">
          Nothing to do. Click + to add your first to-do.
        </p>
      ) : null}

      {folded ? null : (
        <ul className="mt-3 divide-y divide-border">
          {visibleTodos.map((todo) => {
            const overdue = !todo.done && isOverdue(todo.dueDate, today)
            return (
              <li key={todo.id} className="group flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  aria-label={`Mark "${todo.text}" as done`}
                  checked={todo.done}
                  className="h-4 w-4 shrink-0 accent-accent"
                  onChange={(event) => void updateTodo({ id: todo.id, done: event.target.checked })}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 break-words text-sm',
                    todo.done ? 'text-text-muted line-through' : 'text-text'
                  )}
                >
                  {todo.text}
                </span>

                {todo.dueDate ? (
                  <span
                    data-testid="todo-due"
                    className={cn(
                      'shrink-0 text-xs',
                      overdue ? 'font-medium text-accent' : 'text-text-muted'
                    )}
                  >
                    {overdue ? 'Overdue · ' : ''}
                    {formatDueDate(todo.dueDate)}
                  </span>
                ) : null}

                <input
                  type="date"
                  aria-label={`Due date for "${todo.text}"`}
                  value={todo.dueDate ?? ''}
                  className="h-7 w-[7.5rem] shrink-0 rounded-sm border border-transparent bg-transparent px-1 text-xs text-text-muted opacity-0 outline-none group-hover:opacity-100 focus:border-accent focus:opacity-100"
                  onChange={(event) =>
                    void updateTodo({ id: todo.id, dueDate: event.target.value || null })
                  }
                />
                <button
                  type="button"
                  aria-label={`Delete "${todo.text}"`}
                  title="Delete to-do"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-text-muted opacity-0 hover:text-accent focus:opacity-100 group-hover:opacity-100"
                  onClick={() => void deleteTodo(todo.id)}
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!folded && todos.length > COLLAPSED_COUNT ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? 'Show fewer to-dos' : `Show all ${todos.length} to-dos`}
          title={expanded ? 'Show fewer' : 'Show all'}
          className="mx-auto mt-2 flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-text-muted hover:text-accent"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? null : <span>{hiddenCount} more</span>}
          <IconChevronDown
            className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
          />
        </button>
      ) : null}
    </section>
  )
}
