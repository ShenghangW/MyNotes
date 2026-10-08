// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type AppDatabase } from './database'
import { createGroup, deleteGroup, listGroups, renameGroup } from './groupsRepository'
import { createNote, getNote, listNotes, searchNotes, updateNote } from './notesRepository'

function doc(text: string): string {
  return JSON.stringify([
    {
      id: 'b',
      type: 'paragraph',
      props: {},
      content: [{ type: 'text', text, styles: {} }],
      children: []
    }
  ])
}

describe('note groups', () => {
  let dir: string
  let db: AppDatabase

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'mynote-groups-'))
    db = await openDatabase(dir)
  })

  afterEach(() => {
    db.close()
  })

  it('starts with no groups and creates them in order', () => {
    expect(listGroups(db)).toEqual([])
    const school = createGroup(db, '  School ')
    const work = createGroup(db, 'Work')
    expect(school.name).toBe('School')
    expect(listGroups(db).map((g) => g.name)).toEqual(['School', 'Work'])
    expect(work.sortOrder).toBeGreaterThan(school.sortOrder)
  })

  it('rejects empty, overlong, and duplicate names (case-insensitive)', () => {
    createGroup(db, 'School')
    expect(() => createGroup(db, '   ')).toThrow('empty')
    expect(() => createGroup(db, 'x'.repeat(61))).toThrow('60')
    expect(() => createGroup(db, 'school')).toThrow('already exists')
  })

  it('renames a group, allowing a case-only change but not a clash', () => {
    const school = createGroup(db, 'School')
    createGroup(db, 'Work')
    expect(renameGroup(db, school.id, 'SCHOOL').name).toBe('SCHOOL')
    expect(renameGroup(db, school.id, 'Uni').name).toBe('Uni')
    expect(() => renameGroup(db, school.id, 'work')).toThrow('already exists')
    expect(() => renameGroup(db, 'missing', 'X')).toThrow('Group not found')
  })

  it('filters the notes list by group, ungrouped, and all', () => {
    const school = createGroup(db, 'School')
    const work = createGroup(db, 'Work')
    const a = createNote(db, { title: 'A', groupId: school.id })
    const b = createNote(db, { title: 'B', groupId: work.id })
    const c = createNote(db, { title: 'C' })

    expect(listNotes(db, { groupId: school.id }).map((n) => n.id)).toEqual([a.id])
    expect(listNotes(db, { groupId: work.id }).map((n) => n.id)).toEqual([b.id])
    expect(listNotes(db, { groupId: null }).map((n) => n.id)).toEqual([c.id])
    expect(listNotes(db, {})).toHaveLength(3)
    expect(listNotes(db)).toHaveLength(3)
  })

  it('combines search with the group filter', () => {
    const school = createGroup(db, 'School')
    const a = createNote(db, { title: 'Bio', groupId: school.id })
    updateNote(db, { id: a.id, contentJson: doc('mitochondria') })
    const b = createNote(db, { title: 'Bio at work' })
    updateNote(db, { id: b.id, contentJson: doc('mitochondria') })

    expect(
      searchNotes(db, 'mitochondria')
        .map((n) => n.id)
        .sort()
    ).toEqual([a.id, b.id].sort())
    expect(searchNotes(db, 'mitochondria', { groupId: school.id }).map((n) => n.id)).toEqual([a.id])
    expect(searchNotes(db, 'mitochondria', { groupId: null }).map((n) => n.id)).toEqual([b.id])
  })

  it('assigns, moves, and unassigns a note via update', () => {
    const school = createGroup(db, 'School')
    const note = createNote(db)
    expect(updateNote(db, { id: note.id, groupId: school.id }).groupId).toBe(school.id)
    // Leaving groupId out keeps the assignment.
    expect(updateNote(db, { id: note.id, title: 'Renamed' }).groupId).toBe(school.id)
    expect(updateNote(db, { id: note.id, groupId: null }).groupId).toBeNull()
    expect(() => updateNote(db, { id: note.id, groupId: 'nope' })).toThrow('Group not found')
    expect(() => createNote(db, { groupId: 'nope' })).toThrow('Group not found')
  })

  it('deleting a group keeps its notes and ungroups them', () => {
    const school = createGroup(db, 'School')
    const work = createGroup(db, 'Work')
    const a = createNote(db, { title: 'A', groupId: school.id })
    const b = createNote(db, { title: 'B', groupId: work.id })

    deleteGroup(db, school.id)

    expect(listGroups(db).map((g) => g.id)).toEqual([work.id])
    expect(getNote(db, a.id).groupId).toBeNull()
    expect(getNote(db, b.id).groupId).toBe(work.id)
    expect(listNotes(db, { groupId: null }).map((n) => n.id)).toEqual([a.id])
  })

  it('persists groups and assignments across reopen', async () => {
    const school = createGroup(db, 'School')
    const note = createNote(db, { title: 'Kept', groupId: school.id })
    db.close()

    db = await openDatabase(dir)
    expect(listGroups(db).map((g) => g.name)).toEqual(['School'])
    expect(getNote(db, note.id).groupId).toBe(school.id)
  })
})
