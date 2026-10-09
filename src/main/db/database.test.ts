// @vitest-environment node
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase, type AppDatabase } from './database'

describe('database', () => {
  let db: AppDatabase | undefined

  afterEach(() => {
    db?.close()
    db = undefined
  })

  it('applies schema, seeds settings, and round-trips updates on disk', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mynote-db-'))
    db = await openDatabase(dir)

    expect(readFileSync(db.filePath).length).toBeGreaterThan(0)

    const initial = db.getSettings()
    expect(initial.reminderLeadDays).toBe(1)
    expect(initial.homePhotoVisible).toBe(true)
    expect(initial.homePhotoPath).toBeNull()

    const tables = db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    )
    expect(tables.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        'app_settings',
        'note_groups',
        'notes',
        'todos',
        'events',
        'timetable_entries',
        'reminder_dismissals'
      ])
    )

    db.updateSettings({ reminderLeadDays: 2, homePhotoVisible: false })
    db.close()
    db = undefined

    const reopened = await openDatabase(dir)
    db = reopened
    const saved = reopened.getSettings()
    expect(saved.reminderLeadDays).toBe(2)
    expect(saved.homePhotoVisible).toBe(false)
  })
  it('saves an editable Home title, trims it, and resets blank titles to Home', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mynote-title-'))
    db = await openDatabase(dir)
    expect(db.getSettings().homeTitle).toBe('Home')

    expect(db.updateSettings({ homeTitle: '  Good morning  ' }).homeTitle).toBe('Good morning')
    expect(db.updateSettings({ homeTitle: '   ' }).homeTitle).toBe('Home')
    expect(() => db?.updateSettings({ homeTitle: 'x'.repeat(61) })).toThrow('60')

    db.updateSettings({ homeTitle: 'My week' })
    db.close()
    db = await openDatabase(dir)
    expect(db.getSettings().homeTitle).toBe('My week')
  })

  it('upgrades an existing v1 database without losing data', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mynote-migrate-'))
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
      home_photo_path TEXT,
      home_photo_visible INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL)`)
    old.run(`CREATE TABLE events (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, event_date TEXT NOT NULL,
      reminder_enabled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`)
    old.run("INSERT INTO events VALUES ('old1', 'Old exam', '2026-10-20', 1, 'x', 'x')")
    old.run("INSERT INTO app_settings VALUES (1, 2, NULL, 1, '2026-01-01T00:00:00.000Z')")
    old.run('PRAGMA user_version = 1')
    writeFileSync(join(dir, 'app.db'), Buffer.from(old.export()))

    db = await openDatabase(dir)
    const settings = db.getSettings()
    expect(settings.reminderLeadDays).toBe(2)
    expect(settings.homeTitle).toBe('Home')
    expect(db.updateSettings({ homeTitle: 'Dashboard' }).homeTitle).toBe('Dashboard')

    // Old events survive as single-day all-day events.
    const { getEvent } = await import('./eventsRepository')
    expect(getEvent(db, 'old1')).toMatchObject({
      title: 'Old exam',
      startDate: '2026-10-20',
      endDate: '2026-10-20',
      allDay: true,
      color: 'blue',
      reminderEnabled: true,
      todoId: null
    })
  })
})
