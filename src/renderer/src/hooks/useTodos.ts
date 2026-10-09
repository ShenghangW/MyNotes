import { useCallback, useEffect, useState } from 'react'
import type { Todo, TodoUpdateInput } from '@shared/api'
import { errorMessage, unwrap } from '@renderer/lib/ipc'

/** Fired after a to-do is added, edited, or deleted, so other lists on screen can reload. */
export const TODOS_CHANGED = 'mynote:todos-changed'

function notifyChanged(): void {
  window.dispatchEvent(new Event(TODOS_CHANGED))
}

export function useTodos(): {
  todos: Todo[]
  loading: boolean
  error: string | null
  addTodo: (text: string, dueDate: string | null) => Promise<boolean>
  updateTodo: (patch: TodoUpdateInput) => Promise<boolean>
  deleteTodo: (id: string) => Promise<boolean>
  /** Re-reads the saved to-dos (e.g. after the calendar created a linked one). */
  reload: () => Promise<void>
} {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // `keepError` lets a recovery reload run without wiping the message that triggered it.
  const refresh = useCallback(async (keepError = false): Promise<void> => {
    try {
      setTodos(unwrap(await window.api.todos.list()))
      if (!keepError) {
        setError(null)
      }
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const addTodo = useCallback(async (text: string, dueDate: string | null): Promise<boolean> => {
    try {
      const created = unwrap(await window.api.todos.create({ text, dueDate }))
      setTodos((current) => [...current, created])
      setError(null)
      notifyChanged()
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      return false
    }
  }, [])

  const updateTodo = useCallback(
    async (patch: TodoUpdateInput): Promise<boolean> => {
      // Optimistic: the checkbox reacts instantly; a failure reloads the saved state.
      setTodos((current) =>
        current.map((todo) =>
          todo.id === patch.id
            ? {
                ...todo,
                text: patch.text ?? todo.text,
                done: patch.done ?? todo.done,
                dueDate: patch.dueDate === undefined ? todo.dueDate : patch.dueDate
              }
            : todo
        )
      )
      try {
        const saved = unwrap(await window.api.todos.update(patch))
        setTodos((current) => current.map((todo) => (todo.id === saved.id ? saved : todo)))
        setError(null)
        notifyChanged()
        return true
      } catch (caught) {
        setError(errorMessage(caught))
        await refresh(true)
        return false
      }
    },
    [refresh]
  )

  const deleteTodo = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        unwrap(await window.api.todos.delete({ id }))
        setTodos((current) => current.filter((todo) => todo.id !== id))
        setError(null)
        notifyChanged()
        return true
      } catch (caught) {
        setError(errorMessage(caught))
        await refresh(true)
        return false
      }
    },
    [refresh]
  )

  const reload = useCallback(() => refresh(), [refresh])

  return { todos, loading, error, addTodo, updateTodo, deleteTodo, reload }
}
