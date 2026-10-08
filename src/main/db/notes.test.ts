// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openDatabase, type AppDatabase } from './database'
import {
  clearCover,
  createNote,
  deleteNote,
  getNote,
  listNotes,
  searchNotes,
  setCover,
  updateNote
} from './notesRepository'

function doc(...paragraphs: string[]): string {
  return JSON.stringify(
    paragraphs.map((text, index) => ({
      id: `b${index}`,
      type: 'paragraph',
      props: {},
      content: [{ type: 'text', text, styles: {} }],
      children: []
    }))
  )
}

describe('notes repository', () => {
  let dir: string
  let db: AppDatabase

  beforeEach(async () => {
    // Only Date is faked so every write gets a distinct, ordered timestamp.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
    dir = mkdtempSync(join(tmpdir(), 'mynote-notes-'))
    db = await openDatabase(dir)
  })

  afterEach(() => {
    db.close()
    vi.useRealTimers()
  })

  const tick = (): void => {
    vi.setSystemTime(new Date(Date.now() + 1000))
  }

  it('creates a note with defaults and reads it back', () => {
    const note = createNote(db)
    expect(note.title).toBe('Untitled')
    expect(note.contentJson).toBe('[]')
    expect(note.coverImagePath).toBeNull()
    expect(getNote(db, note.id)).toEqual(note)
  })

  it('updates title and content, and an empty title becomes Untitled', () => {
    const note = createNote(db, { title: 'Draft' })
    tick()
    const updated = updateNote(db, { id: note.id, title: 'Biology', contentJson: doc('Cells') })
    expect(updated.title).toBe('Biology')
    expect(updated.preview).toBe('Cells')
    expect(updated.updatedAt > note.updatedAt).toBe(true)

    expect(updateNote(db, { id: note.id, title: '   ' }).title).toBe('Untitled')
    expect(updateNote(db, { id: note.id }).contentJson).toBe(doc('Cells'))
  })

  it('rejects content that is not a BlockNote document', () => {
    const note = createNote(db)
    expect(() => updateNote(db, { id: note.id, contentJson: '{"nope":true}' })).toThrow()
    expect(() => updateNote(db, { id: note.id, contentJson: 'not json' })).toThrow()
    expect(getNote(db, note.id).contentJson).toBe('[]')
  })

  it('lists most recently edited first', () => {
    const a = createNote(db, { title: 'A' })
    tick()
    const b = createNote(db, { title: 'B' })
    tick()
    updateNote(db, { id: a.id, title: 'A edited' })

    expect(listNotes(db).map((n) => n.title)).toEqual(['A edited', 'B'])
    expect(listNotes(db).some((n) => 'contentJson' in n)).toBe(false)
    expect(b.id).not.toBe(a.id)
  })

  it('searches title and body text, and ignores BlockNote field names', () => {
    const one = createNote(db, { title: 'Groceries' })
    updateNote(db, { id: one.id, contentJson: doc('buy oat milk and bread') })
    const two = createNote(db, { title: 'Lecture 3' })
    updateNote(db, { id: two.id, contentJson: doc('Mitochondria produce ATP') })

    expect(searchNotes(db, 'mitochondria').map((n) => n.id)).toEqual([two.id])
    expect(searchNotes(db, 'LECTURE').map((n) => n.id)).toEqual([two.id])
    expect(searchNotes(db, 'oat bread').map((n) => n.id)).toEqual([one.id])
    expect(searchNotes(db, 'oat atp')).toEqual([])
    // "paragraph" / "text" exist only as JSON keys, never as visible text.
    expect(searchNotes(db, 'paragraph')).toEqual([])
    expect(searchNotes(db, '   ')).toHaveLength(2)
  })

  it('deletes a note and reports its images for cleanup', () => {
    const note = createNote(db)
    updateNote(db, {
      id: note.id,
      contentJson: JSON.stringify([
        {
          id: 'i',
          type: 'image',
          props: { url: 'app-image://local/images/inline.png' },
          children: []
        }
      ])
    })
    setCover(db, note.id, 'images/cover.png')

    const candidates = deleteNote(db, note.id)
    expect(candidates.sort()).toEqual(['images/cover.png', 'images/inline.png'])
    expect(() => getNote(db, note.id)).toThrow('Note not found')
    expect(listNotes(db)).toEqual([])
  })

  it('sets, replaces, and clears a cover; referenced images include cover + inline', () => {
    const note = createNote(db)
    const withCover = setCover(db, note.id, 'images/one.png')
    expect(withCover.note.coverImagePath).toBe('images/one.png')
    expect(withCover.previous).toBeNull()

    const replaced = setCover(db, note.id, 'images/two.png')
    expect(replaced.previous).toBe('images/one.png')

    updateNote(db, {
      id: note.id,
      contentJson: JSON.stringify([
        {
          id: 'i',
          type: 'image',
          props: { url: 'app-image://local/images/inline.png' },
          children: []
        }
      ])
    })
    expect([...db.referencedImagePaths()].sort()).toEqual(['images/inline.png', 'images/two.png'])

    const cleared = clearCover(db, note.id)
    expect(cleared.previous).toBe('images/two.png')
    expect(cleared.note.coverImagePath).toBeNull()
  })

  it('rejects cover paths outside the images folder', () => {
    const note = createNote(db)
    expect(() => setCover(db, note.id, '../secret.png')).toThrow()
    expect(() => setCover(db, note.id, 'images/../../secret.png')).toThrow()
    expect(() => setCover(db, note.id, 'C:\\secret.png')).toThrow()
  })

  it('survives closing and reopening the database, cover included', async () => {
    const note = createNote(db, { title: 'Persistent' })
    updateNote(db, { id: note.id, contentJson: doc('still here') })
    setCover(db, note.id, 'images/banner.png')
    db.close()

    db = await openDatabase(dir)
    const reloaded = getNote(db, note.id)
    expect(reloaded.title).toBe('Persistent')
    expect(reloaded.preview).toBe('still here')
    expect(reloaded.coverImagePath).toBe('images/banner.png')
  })
})
