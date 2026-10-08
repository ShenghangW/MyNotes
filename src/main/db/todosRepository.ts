import { randomUUID } from 'node:crypto'
import type { SqlValue } from 'sql.js'
import type { Todo, TodoCreateInput, TodoUpdateInput } from '../../shared/api'
import type { AppDatabase } from './database'

type TodoRow = Record<string, SqlValue>

const COLUMNS = 'id, text, done, due_date, sort_order, created_at, updated_at'
const MAX_TEXT_LENGTH = 300

function toTodo(row: TodoRow): Todo {
  return {
    id: String(row.id),
    text: String(row.text),
    done: Number(row.done) === 1,
    dueDate: typeof row.due_date === 'string' ? row.due_date : null,
    sortOrder: Number(row.sort_order),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

function cleanText(text: string | undefined): string {
  const trimmed = (text ?? '').trim()
  if (trimmed === '') {
    throw new Error('To-do text cannot be empty')
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new Error(`To-do text must be ${MAX_TEXT_LENGTH} characters or fewer`)
  }
  return trimmed
}

/** Accepts only real calendar dates in YYYY-MM-DD form; '' counts as "no date". */
export function cleanDueDate(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
    const date = new Date(Date.UTC(year, month - 1, day))
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return value
    }
  }
  throw new Error('Due date must be a valid date (YYYY-MM-DD)')
}

/** Stable manual order; new to-dos are appended at the bottom. */
export function listTodos(db: AppDatabase): Todo[] {
  return db
    .all<TodoRow>(`SELECT ${COLUMNS} FROM todos ORDER BY sort_order ASC, created_at ASC`)
    .map(toTodo)
}

export function getTodo(db: AppDatabase, id: string): Todo {
  const row = db.get<TodoRow>(`SELECT ${COLUMNS} FROM todos WHERE id = ?`, [id])
  if (!row) {
    throw new Error('To-do not found')
  }
  return toTodo(row)
}

export function createTodo(db: AppDatabase, input: TodoCreateInput): Todo {
  const text = cleanText(input.text)
  const dueDate = cleanDueDate(input.dueDate)
  const next = db.get<TodoRow>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM todos')
  const id = randomUUID()
  const now = new Date().toISOString()
  db.run(
    `INSERT INTO todos (id, text, done, due_date, sort_order, created_at, updated_at)
     VALUES (?, ?, 0, ?, ?, ?, ?)`,
    [id, text, dueDate, Number(next?.next ?? 0), now, now]
  )
  return getTodo(db, id)
}

export function updateTodo(db: AppDatabase, input: TodoUpdateInput): Todo {
  const current = getTodo(db, input.id)
  const text = input.text === undefined ? current.text : cleanText(input.text)
  const done = input.done === undefined ? current.done : input.done
  const dueDate = input.dueDate === undefined ? current.dueDate : cleanDueDate(input.dueDate)
  db.run('UPDATE todos SET text = ?, done = ?, due_date = ?, updated_at = ? WHERE id = ?', [
    text,
    done ? 1 : 0,
    dueDate,
    new Date().toISOString(),
    input.id
  ])
  return getTodo(db, input.id)
}

export function deleteTodo(db: AppDatabase, id: string): void {
  getTodo(db, id)
  db.run('DELETE FROM todos WHERE id = ?', [id])
}

/** Listed ids move to the front in the given order; unlisted to-dos keep their order after them. */
export function reorderTodos(db: AppDatabase, ids: string[]): Todo[] {
  const existing = listTodos(db).map((todo) => todo.id)
  const known = new Set(existing)
  for (const id of ids) {
    if (!known.has(id)) {
      throw new Error('To-do not found')
    }
  }
  const front = [...new Set(ids)]
  const frontSet = new Set(front)
  const order = [...front, ...existing.filter((id) => !frontSet.has(id))]
  order.forEach((id, index) => {
    db.run('UPDATE todos SET sort_order = ? WHERE id = ?', [index, id])
  })
  return listTodos(db)
}
