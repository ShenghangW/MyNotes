// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase, type AppDatabase } from './database'

describe('notes (basic CRUD)', () => {
  let db: AppDatabase | undefined

  afterEach(() => {
    db?.close()
    db = undefined
  })

  it('creates a note with default title and empty content', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mynote-notes-'))
    db = await openDatabase(dir)

    const created = db.createNote({})
    expect(created.title).toBe('Untitled')
    expect(created.contentJson).toBe('')
    expect(created.groupId).toBeNull()
    expect(created.coverImagePath).toBeNull()
  })

  it('lists notes ordered by most recently updated first', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mynote-notes-list-'))
    db = await openDatabase(dir)

    const first = db.createNote({})
    const second = db.createNote({})
    db.updateNote({ id: first.id, title: 'Edited later' })

    const listed = db.listNotes()
    expect(listed[0].id).toBe(first.id)
    expect(listed.map((n) => n.id)).toContain(second.id)
  })

  it('updates a note, falling back to Untitled for a blank title', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mynote-notes-update-'))
    db = await openDatabase(dir)

    const note = db.createNote({})
    const updated = db.updateNote({
      id: note.id,
      title: 'Java programming basics',
      contentJson: 'The usage and difference of string, int and double.'
    })
    expect(updated.title).toBe('Java programming basics')
    expect(updated.contentJson).toBe('The usage and difference of string, int and double.')

    const blanked = db.updateNote({ id: note.id, title: '   ' })
    expect(blanked.title).toBe('Untitled')
  })

  it('deletes a note', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mynote-notes-delete-'))
    db = await openDatabase(dir)

    const note = db.createNote({})
    db.deleteNote(note.id)
    expect(() => db!.getNote(note.id)).toThrow()
  })
})
