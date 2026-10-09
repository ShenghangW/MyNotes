import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { Database, SqlValue } from 'sql.js'
import schemaSql from './schema.sql?raw'
import {
  DEFAULT_HOME_TITLE,
  MAX_HOME_TITLE_LENGTH,
  type AppSettings,
  type SettingsPatch
} from '../../shared/api'
import { extractInlineImagePaths } from '../../shared/imageUrl'

const require = createRequire(__filename)

type SqlJsStatic = {
  Database: new (data?: ArrayLike<number> | Buffer | null) => Database
}

type InitSqlJs = (config?: { locateFile?: (file: string) => string }) => Promise<SqlJsStatic>

const SCHEMA_VERSION = 4

function nowIso(): string {
  return new Date().toISOString()
}

function locateWasm(file: string): string {
  const packaged = join(process.resourcesPath ?? '', file)
  if (process.resourcesPath && existsSync(packaged)) {
    return packaged
  }
  return join(dirname(require.resolve('sql.js')), file)
}

function userVersion(db: Database): number {
  const stmt = db.prepare('PRAGMA user_version')
  stmt.step()
  const row = stmt.getAsObject() as { user_version?: number }
  stmt.free()
  return Number(row.user_version ?? 0)
}

function applySchema(db: Database): void {
  db.run('PRAGMA foreign_keys = ON')
  const version = userVersion(db)
  if (version >= SCHEMA_VERSION) {
    return
  }
  if (version === 0) {
    // Brand-new database: schema.sql already describes the latest shape.
    db.run(schemaSql)
    db.run(
      `INSERT OR IGNORE INTO app_settings (id, reminder_lead_days, home_photo_path, home_photo_visible, updated_at)
       VALUES (1, 1, NULL, 1, ?)`,
      [nowIso()]
    )
    db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`)
    return
  }
  if (version < 2) {
    // v1 -> v2: editable Home title.
    db.run(
      `ALTER TABLE app_settings ADD COLUMN home_title TEXT NOT NULL DEFAULT '${DEFAULT_HOME_TITLE}'`
    )
  }
  if (version < 3) {
    // v2 -> v3: events get an end, times, a colour and an optional linked to-do.
    // Existing events become single-day, all-day events.
    db.run('ALTER TABLE events ADD COLUMN end_date TEXT')
    db.run('ALTER TABLE events ADD COLUMN start_time TEXT')
    db.run('ALTER TABLE events ADD COLUMN end_time TEXT')
    db.run('ALTER TABLE events ADD COLUMN all_day INTEGER NOT NULL DEFAULT 1')
    db.run("ALTER TABLE events ADD COLUMN color TEXT NOT NULL DEFAULT 'blue'")
    db.run('ALTER TABLE events ADD COLUMN todo_id TEXT')
    db.run('UPDATE events SET end_date = event_date WHERE end_date IS NULL')
  }
  if (version < 4) {
    // v3 -> v4: timetable classes get a free-text description (was `location`) and a colour.
    const stmt = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'timetable_entries'"
    )
    const exists = stmt.step()
    stmt.free()
    if (exists) {
      db.run('ALTER TABLE timetable_entries RENAME COLUMN location TO description')
      db.run("ALTER TABLE timetable_entries ADD COLUMN color TEXT NOT NULL DEFAULT 'blue'")
    } else {
      db.run(`CREATE TABLE timetable_entries (
        id TEXT PRIMARY KEY,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_minutes INTEGER NOT NULL,
        end_minutes INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        color TEXT NOT NULL DEFAULT 'blue',
        updated_at TEXT NOT NULL,
        CHECK (end_minutes > start_minutes)
      )`)
    }
  }
  db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`)
}

/** Trims the Home title; an empty title resets to the default instead of leaving a blank heading. */
function cleanHomeTitle(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') {
    return DEFAULT_HOME_TITLE
  }
  if (trimmed.length > MAX_HOME_TITLE_LENGTH) {
    throw new Error(`Title must be ${MAX_HOME_TITLE_LENGTH} characters or fewer`)
  }
  return trimmed
}

function mapSettings(row: Record<string, SqlValue>): AppSettings {
  const lead = Number(row.reminder_lead_days)
  return {
    reminderLeadDays: lead === 2 ? 2 : 1,
    homeTitle:
      typeof row.home_title === 'string' && row.home_title.trim() !== ''
        ? row.home_title
        : DEFAULT_HOME_TITLE,
    homePhotoPath: typeof row.home_photo_path === 'string' ? row.home_photo_path : null,
    homePhotoVisible: Number(row.home_photo_visible) === 1,
    updatedAt: String(row.updated_at)
  }
}

export class AppDatabase {
  constructor(
    private readonly db: Database,
    readonly filePath: string
  ) {}

  persist(): void {
    writeFileSync(this.filePath, Buffer.from(this.db.export()))
  }

  close(): void {
    this.persist()
    this.db.close()
  }

  get<T extends Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): T | undefined {
    const stmt = this.db.prepare(sql)
    if (params.length > 0) {
      stmt.bind(params)
    }
    const row = stmt.step() ? (stmt.getAsObject() as T) : undefined
    stmt.free()
    return row
  }

  all<T extends Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): T[] {
    const stmt = this.db.prepare(sql)
    if (params.length > 0) {
      stmt.bind(params)
    }
    const rows: T[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T)
    }
    stmt.free()
    return rows
  }

  run(sql: string, params: SqlValue[] = []): void {
    this.db.run(sql, params)
    this.persist()
  }

  exec(sql: string): void {
    this.db.run(sql)
    this.persist()
  }

  getSettings(): AppSettings {
    const row = this.get<Record<string, SqlValue>>(
      'SELECT reminder_lead_days, home_title, home_photo_path, home_photo_visible, updated_at FROM app_settings WHERE id = 1'
    )
    if (!row) {
      throw new Error('app_settings row is missing')
    }
    return mapSettings(row)
  }

  updateSettings(patch: SettingsPatch): AppSettings {
    const current = this.getSettings()
    const next: AppSettings = {
      reminderLeadDays: patch.reminderLeadDays ?? current.reminderLeadDays,
      homeTitle:
        patch.homeTitle === undefined ? current.homeTitle : cleanHomeTitle(patch.homeTitle),
      homePhotoPath:
        patch.homePhotoPath === undefined ? current.homePhotoPath : patch.homePhotoPath,
      homePhotoVisible: patch.homePhotoVisible ?? current.homePhotoVisible,
      updatedAt: nowIso()
    }

    if (next.reminderLeadDays !== 1 && next.reminderLeadDays !== 2) {
      throw new Error('reminderLeadDays must be 1 or 2')
    }

    this.run(
      `UPDATE app_settings
       SET reminder_lead_days = ?, home_title = ?, home_photo_path = ?, home_photo_visible = ?, updated_at = ?
       WHERE id = 1`,
      [
        next.reminderLeadDays,
        next.homeTitle,
        next.homePhotoPath,
        next.homePhotoVisible ? 1 : 0,
        next.updatedAt
      ]
    )
    return this.getSettings()
  }

  referencedImagePaths(): Set<string> {
    const refs = new Set<string>()
    const settings = this.getSettings()
    if (settings.homePhotoPath) {
      refs.add(settings.homePhotoPath)
    }
    for (const row of this.all<{ cover_image_path: SqlValue; content_json: SqlValue }>(
      'SELECT cover_image_path, content_json FROM notes'
    )) {
      if (typeof row.cover_image_path === 'string') {
        refs.add(row.cover_image_path)
      }
      if (typeof row.content_json === 'string') {
        for (const path of extractInlineImagePaths(row.content_json)) {
          refs.add(path)
        }
      }
    }
    return refs
  }
}

let sqlJs: SqlJsStatic | null = null

export async function openDatabase(userDataRoot: string): Promise<AppDatabase> {
  mkdirSync(userDataRoot, { recursive: true })
  if (!sqlJs) {
    const initSqlJs = require('sql.js') as InitSqlJs
    sqlJs = await initSqlJs({ locateFile: locateWasm })
  }

  const filePath = join(userDataRoot, 'app.db')
  const db = existsSync(filePath)
    ? new sqlJs.Database(readFileSync(filePath))
    : new sqlJs.Database()

  applySchema(db)
  const appDb = new AppDatabase(db, filePath)
  appDb.persist()
  return appDb
}
