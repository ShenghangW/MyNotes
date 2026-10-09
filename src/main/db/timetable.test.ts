// @vitest-environment node
import { mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type AppDatabase } from './database'
import {
  createTimetableEntries,
  deleteTimetableEntry,
  getTimetableEntry,
  listTimetable,
  updateTimetableEntry
} from './timetableRepository'

describe('timetable', () => {
  let dir: string
  let db: AppDatabase

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'mynote-timetable-'))
    db = await openDatabase(dir)
  })

  afterEach(() => {
    db.close()
  })

  it('adds a class on every chosen day and lists the week in order', () => {
    const created = createTimetableEntries(db, {
      title: '  Software Testing ',
      days: [3, 0, 0],
      startTime: '12:30',
      endTime: '14:30',
      description: ' Room 080.02.007 '
    })
    expect(created).toHaveLength(2) // duplicate day ignored
    expect(created[0]).toMatchObject({
      title: 'Software Testing',
      startTime: '12:30',
      endTime: '14:30',
      description: 'Room 080.02.007',
      color: 'blue'
    })

    createTimetableEntries(db, { title: 'Early', days: [0], startTime: '08:00', endTime: '09:00' })
    expect(listTimetable(db).map((e) => [e.dayOfWeek, e.startTime, e.title])).toEqual([
      [0, '08:00', 'Early'],
      [0, '12:30', 'Software Testing'],
      [3, '12:30', 'Software Testing']
    ])
  })

  it('treats a blank description as none and keeps the chosen colour', () => {
    const [entry] = createTimetableEntries(db, {
      title: 'Maths',
      days: [1],
      startTime: '09:00',
      endTime: '10:00',
      description: '   ',
      color: 'green'
    })
    expect(entry.description).toBeNull()
    expect(entry.color).toBe('green')
  })

  it('rejects empty titles, bad days and bad or backwards times', () => {
    const ok = { title: 'x', days: [0], startTime: '09:00', endTime: '10:00' }
    expect(() => createTimetableEntries(db, { ...ok, title: '  ' })).toThrow('empty')
    expect(() => createTimetableEntries(db, { ...ok, title: 'x'.repeat(201) })).toThrow('200')
    expect(() => createTimetableEntries(db, { ...ok, days: [] })).toThrow('at least one day')
    expect(() => createTimetableEntries(db, { ...ok, days: [7] })).toThrow('Monday and Sunday')
    expect(() => createTimetableEntries(db, { ...ok, startTime: '25:00' })).toThrow('24-hour')
    expect(() => createTimetableEntries(db, { ...ok, endTime: '09:00' })).toThrow('after the start')
    expect(() => createTimetableEntries(db, { ...ok, description: 'x'.repeat(1001) })).toThrow(
      '1000'
    )
    expect(listTimetable(db)).toEqual([])
  })

  it('allows overlapping classes on the same day', () => {
    createTimetableEntries(db, { title: 'A', days: [0], startTime: '12:00', endTime: '14:00' })
    createTimetableEntries(db, { title: 'B', days: [0], startTime: '13:00', endTime: '15:00' })
    createTimetableEntries(db, { title: 'C', days: [0, 1], startTime: '13:30', endTime: '14:30' })
    expect(listTimetable(db).map((e) => e.title)).toEqual(['A', 'B', 'C', 'C'])
  })

  it('edits a class (times, day, description) and rejects bad edits', () => {
    const [a] = createTimetableEntries(db, {
      title: 'A',
      days: [0],
      startTime: '09:00',
      endTime: '10:00',
      description: 'Room 1'
    })
    const [b] = createTimetableEntries(db, {
      title: 'B',
      days: [0],
      startTime: '11:00',
      endTime: '12:00'
    })

    const moved = updateTimetableEntry(db, { id: a.id, endTime: '10:30', description: null })
    expect(moved).toMatchObject({ endTime: '10:30', description: null, title: 'A' })

    const renamed = updateTimetableEntry(db, { id: a.id, title: 'A2', dayOfWeek: 4 })
    expect(renamed).toMatchObject({ title: 'A2', dayOfWeek: 4, startTime: '09:00' })

    expect(() => updateTimetableEntry(db, { id: b.id, endTime: '10:00' })).toThrow(
      'after the start'
    )
    expect(() => updateTimetableEntry(db, { id: 'missing', title: 'x' })).toThrow('not found')
  })

  it('deletes a class, and classes survive close and reopen', async () => {
    const [entry] = createTimetableEntries(db, {
      title: 'Keep',
      days: [5],
      startTime: '09:00',
      endTime: '10:00',
      description: 'Lab'
    })
    db.close()
    db = await openDatabase(dir)
    expect(getTimetableEntry(db, entry.id)).toMatchObject({ title: 'Keep', description: 'Lab' })

    deleteTimetableEntry(db, entry.id)
    expect(listTimetable(db)).toEqual([])
    expect(() => deleteTimetableEntry(db, entry.id)).toThrow('not found')
  })

  it('upgrades a v3 database: location becomes description, entries get a colour', async () => {
    const upgradeDir = mkdtempSync(join(tmpdir(), 'mynote-timetable-migrate-'))
    const require = createRequire(__filename)
    const initSqlJs = require('sql.js') as (config?: unknown) => Promise<{
      Database: new () => {
        run: (sql: string, params?: unknown[]) => void
        export: () => Uint8Array
      }
    }>
    const SQL = await initSqlJs()
    const old = new SQL.Database()
    old.run(`CREATE TABLE app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      reminder_lead_days INTEGER NOT NULL CHECK (reminder_lead_days IN (1, 2)),
      home_title TEXT NOT NULL DEFAULT 'Home',
      home_photo_path TEXT,
      home_photo_visible INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL)`)
    old.run("INSERT INTO app_settings VALUES (1, 1, 'Home', NULL, 1, '2026-01-01T00:00:00.000Z')")
    old.run(`CREATE TABLE timetable_entries (
      id TEXT PRIMARY KEY,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_minutes INTEGER NOT NULL,
      end_minutes INTEGER NOT NULL,
      title TEXT NOT NULL,
      location TEXT,
      updated_at TEXT NOT NULL,
      CHECK (end_minutes > start_minutes))`)
    old.run(
      "INSERT INTO timetable_entries VALUES ('old1', 1, 600, 660, 'Old class', 'Room 9', 'x')"
    )
    old.run('PRAGMA user_version = 3')
    writeFileSync(join(upgradeDir, 'app.db'), Buffer.from(old.export()))

    db.close()
    db = await openDatabase(upgradeDir)
    expect(getTimetableEntry(db, 'old1')).toMatchObject({
      title: 'Old class',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '11:00',
      description: 'Room 9',
      color: 'blue'
    })
  })
})
