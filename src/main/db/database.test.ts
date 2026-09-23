// @vitest-environment node
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase, type AppDatabase } from './database'
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
})
