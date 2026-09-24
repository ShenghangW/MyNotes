import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { Database, SqlValue } from 'sql.js'
import schemaSql from './schema.sql?raw'
import type { AppSettings, Note, NoteCreateInput, NoteUpdateInput, SettingsPatch } from '../../shared/api'

const require = createRequire(__filename)

type SqlJsStatic = {
  Database: new (data?: ArrayLike<number> | Buffer | null) => Database
}

type InitSqlJs = (config?: { locateFile?: (file: string) => string }) => Promise<SqlJsStatic>

const SCHEMA_VERSION = 1

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
  if (userVersion(db) >= SCHEMA_VERSION) {
    return
  }
  db.run(schemaSql)
  db.run(
    `INSERT OR IGNORE INTO app_settings (id, reminder_lead_days, home_photo_path, home_photo_visible, updated_at)
     VALUES (1, 1, NULL, 1, ?)`,
    [nowIso()]
  )
  db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`)
}

function mapSettings(row: Record<string, SqlValue>): AppSettings {
  const lead = Number(row.reminder_lead_days)
  return {
    reminderLeadDays: lead === 2 ? 2 : 1,
    homePhotoPath: typeof row.home_photo_path === 'string' ? row.home_photo_path : null,
    homePhotoVisible: Number(row.home_photo_visible) === 1,
    updatedAt: String(row.updated_at)
  }
}

function mapNote(row: Record<string, SqlValue>): Note {
  return {
    id: String(row.id),
    title: String(row.title),
    contentJson: String(row.content_json),
    groupId: typeof row.group_id === 'string' ? row.group_id : null,
    coverImagePath: typeof row.cover_image_path === 'string' ? row.cover_image_path : null,
    createdAt: String(row.created_at),
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
      'SELECT reminder_lead_days, home_photo_path, home_photo_visible, updated_at FROM app_settings WHERE id = 1'
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
      homePhotoPath: patch.homePhotoPath === undefined ? current.homePhotoPath : patch.homePhotoPath,
      homePhotoVisible: patch.homePhotoVisible ?? current.homePhotoVisible,
      updatedAt: nowIso()
    }

    if (next.reminderLeadDays !== 1 && next.reminderLeadDays !== 2) {
      throw new Error('reminderLeadDays must be 1 or 2')
    }

    this.run(
      `UPDATE app_settings
       SET reminder_lead_days = ?, home_photo_path = ?, home_photo_visible = ?, updated_at = ?
       WHERE id = 1`,
      [
        next.reminderLeadDays,
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
    for (const row of this.all<{ cover_image_path: SqlValue }>(
      'SELECT cover_image_path FROM notes WHERE cover_image_path IS NOT NULL'
    )) {
      if (typeof row.cover_image_path === 'string') {
        refs.add(row.cover_image_path)
      }
    }
    return refs
  }

  listNotes(): Note[] {
    return this.all<Record<string, SqlValue>>('SELECT * FROM notes ORDER BY updated_at DESC').map(
      mapNote
    )
  }

  getNote(id: string): Note {
    const row = this.get<Record<string, SqlValue>>('SELECT * FROM notes WHERE id = ?', [id])
    if (!row) {
      throw new Error('Note not found')
    }
    return mapNote(row)
  }

  createNote(input: NoteCreateInput = {}): Note {
    const id = randomUUID()
    const timestamp = nowIso()
    this.run(
      `INSERT INTO notes (id, title, content_json, group_id, cover_image_path, created_at, updated_at)
       VALUES (?, 'Untitled', '', ?, NULL, ?, ?)`,
      [id, input.groupId ?? null, timestamp, timestamp]
    )
    return this.getNote(id)
  }

  updateNote(input: NoteUpdateInput): Note {
    const current = this.getNote(input.id)
    const title =
      input.title !== undefined ? (input.title.trim() === '' ? 'Untitled' : input.title) : current.title
    const contentJson = input.contentJson ?? current.contentJson
    const groupId = input.groupId === undefined ? current.groupId : input.groupId

    this.run(
      'UPDATE notes SET title = ?, content_json = ?, group_id = ?, updated_at = ? WHERE id = ?',
      [title, contentJson, groupId, nowIso(), input.id]
    )
    return this.getNote(input.id)
  }

  deleteNote(id: string): void {
    this.run('DELETE FROM notes WHERE id = ?', [id])
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
