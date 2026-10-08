import { randomUUID } from 'node:crypto'
import type { SqlValue } from 'sql.js'
import type { NoteGroup } from '../../shared/api'
import type { AppDatabase } from './database'

type GroupRow = Record<string, SqlValue>

const COLUMNS = 'id, name, sort_order, created_at, updated_at'

function toGroup(row: GroupRow): NoteGroup {
  return {
    id: String(row.id),
    name: String(row.name),
    sortOrder: Number(row.sort_order),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

function cleanName(name: string): string {
  const trimmed = (name ?? '').trim()
  if (trimmed === '') {
    throw new Error('Group name cannot be empty')
  }
  if (trimmed.length > 60) {
    throw new Error('Group name must be 60 characters or fewer')
  }
  return trimmed
}

function assertNameFree(db: AppDatabase, name: string, exceptId?: string): void {
  const clash = db.get<GroupRow>(
    'SELECT id FROM note_groups WHERE name = ? COLLATE NOCASE AND id != ?',
    [name, exceptId ?? '']
  )
  if (clash) {
    throw new Error(`A group named "${name}" already exists`)
  }
}

export function listGroups(db: AppDatabase): NoteGroup[] {
  return db
    .all<GroupRow>(
      `SELECT ${COLUMNS} FROM note_groups ORDER BY sort_order ASC, name COLLATE NOCASE`
    )
    .map(toGroup)
}

export function getGroup(db: AppDatabase, id: string): NoteGroup {
  const row = db.get<GroupRow>(`SELECT ${COLUMNS} FROM note_groups WHERE id = ?`, [id])
  if (!row) {
    throw new Error('Group not found')
  }
  return toGroup(row)
}

export function createGroup(db: AppDatabase, name: string): NoteGroup {
  const clean = cleanName(name)
  assertNameFree(db, clean)
  const next = db.get<GroupRow>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM note_groups')
  const id = randomUUID()
  const now = new Date().toISOString()
  db.run(
    'INSERT INTO note_groups (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, clean, Number(next?.next ?? 0), now, now]
  )
  return getGroup(db, id)
}

export function renameGroup(db: AppDatabase, id: string, name: string): NoteGroup {
  getGroup(db, id)
  const clean = cleanName(name)
  assertNameFree(db, clean, id)
  db.run('UPDATE note_groups SET name = ?, updated_at = ? WHERE id = ?', [
    clean,
    new Date().toISOString(),
    id
  ])
  return getGroup(db, id)
}

/** Deletes the group; its notes are kept and become ungrouped (Q6). */
export function deleteGroup(db: AppDatabase, id: string): void {
  getGroup(db, id)
  // Explicit ungroup so the behaviour never depends on the foreign_keys pragma.
  db.run('UPDATE notes SET group_id = NULL WHERE group_id = ?', [id])
  db.run('DELETE FROM note_groups WHERE id = ?', [id])
}
