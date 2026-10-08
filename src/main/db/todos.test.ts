// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type AppDatabase } from './database'
import { createNote, getNote, updateNote } from './notesRepository'
import { createGroup } from './groupsRepository'
import {
  cleanDueDate,
  createTodo,
  deleteTodo,
  listTodos,
  reorderTodos,
  updateTodo
} from './todosRepository'

describe('todos', () => {
  let dir: string
  let db: AppDatabase

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'mynote-todos-'))
    db = await openDatabase(dir)
  })

  afterEach(() => {
    db.close()
  })

  it('creates to-dos in order, trimmed, with an optional due date', () => {
    const a = createTodo(db, { text: '  Buy milk  ' })
    const b = createTodo(db, { text: 'Hand in essay', dueDate: '2026-10-20' })
    expect(a.text).toBe('Buy milk')
    expect(a.done).toBe(false)
    expect(a.dueDate).toBeNull()
    expect(b.dueDate).toBe('2026-10-20')
    expect(listTodos(db).map((t) => t.id)).toEqual([a.id, b.id])
  })

  it('rejects empty text and invalid dates', () => {
    expect(() => createTodo(db, { text: '   ' })).toThrow('empty')
    expect(() => createTodo(db, { text: 'x'.repeat(301) })).toThrow('300')
    expect(() => createTodo(db, { text: 'x', dueDate: '2026-02-30' })).toThrow('valid date')
    expect(() => createTodo(db, { text: 'x', dueDate: '10/20/2026' })).toThrow('valid date')
    expect(cleanDueDate('')).toBeNull()
    expect(cleanDueDate('2028-02-29')).toBe('2028-02-29')
  })

  it('toggling done persists across close and reopen', async () => {
    const todo = createTodo(db, { text: 'Persist me' })
    expect(updateTodo(db, { id: todo.id, done: true }).done).toBe(true)
    db.close()

    db = await openDatabase(dir)
    expect(listTodos(db)[0].done).toBe(true)
    expect(updateTodo(db, { id: todo.id, done: false }).done).toBe(false)
  })

  it('keeps the same order after toggling and reloading', async () => {
    const a = createTodo(db, { text: 'A' })
    const b = createTodo(db, { text: 'B' })
    const c = createTodo(db, { text: 'C' })
    updateTodo(db, { id: a.id, done: true })
    updateTodo(db, { id: b.id, text: 'B edited' })
    db.close()

    db = await openDatabase(dir)
    expect(listTodos(db).map((t) => t.id)).toEqual([a.id, b.id, c.id])
  })

  it('sets, keeps, and clears the due date on update', () => {
    const todo = createTodo(db, { text: 'Dated' })
    expect(updateTodo(db, { id: todo.id, dueDate: '2026-11-01' }).dueDate).toBe('2026-11-01')
    expect(updateTodo(db, { id: todo.id, text: 'Renamed' }).dueDate).toBe('2026-11-01')
    expect(updateTodo(db, { id: todo.id, dueDate: null }).dueDate).toBeNull()
  })

  it('deletes a to-do and reports a missing one', () => {
    const todo = createTodo(db, { text: 'Gone' })
    deleteTodo(db, todo.id)
    expect(listTodos(db)).toEqual([])
    expect(() => deleteTodo(db, todo.id)).toThrow('not found')
    expect(() => updateTodo(db, { id: todo.id, done: true })).toThrow('not found')
  })

  it('appends after the highest sort order even after deletions', () => {
    const a = createTodo(db, { text: 'A' })
    const b = createTodo(db, { text: 'B' })
    deleteTodo(db, a.id)
    const c = createTodo(db, { text: 'C' })
    expect(listTodos(db).map((t) => t.id)).toEqual([b.id, c.id])
  })

  it('reorders: listed ids first, the rest keep their order', async () => {
    const a = createTodo(db, { text: 'A' })
    const b = createTodo(db, { text: 'B' })
    const c = createTodo(db, { text: 'C' })

    expect(reorderTodos(db, [c.id, a.id]).map((t) => t.id)).toEqual([c.id, a.id, b.id])
    expect(() => reorderTodos(db, ['missing'])).toThrow('not found')
    db.close()

    db = await openDatabase(dir)
    expect(listTodos(db).map((t) => t.id)).toEqual([c.id, a.id, b.id])
  })
})

describe('moving a note between groups', () => {
  let db: AppDatabase

  beforeEach(async () => {
    db = await openDatabase(mkdtempSync(join(tmpdir(), 'mynote-move-')))
  })

  afterEach(() => {
    db.close()
  })

  it('does not change "last edited", but a real edit still does', async () => {
    const group = createGroup(db, 'School')
    const note = createNote(db, { title: 'Essay' })
    await new Promise((resolve) => setTimeout(resolve, 5))

    const moved = updateNote(db, { id: note.id, groupId: group.id })
    expect(moved.groupId).toBe(group.id)
    expect(moved.updatedAt).toBe(note.updatedAt)

    const edited = updateNote(db, { id: note.id, title: 'Essay v2' })
    expect(edited.updatedAt > note.updatedAt).toBe(true)
    expect(getNote(db, note.id).groupId).toBe(group.id)
  })
})
