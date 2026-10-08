import { randomUUID } from 'node:crypto'
import type { SqlValue } from 'sql.js'
import type { Note, NoteCreateInput, NoteSummary, NoteUpdateInput } from '../../shared/api'
import { extractInlineImagePaths } from '../../shared/imageUrl'
import { extractPlainText, makePreview } from '../../shared/noteText'
import type { AppDatabase } from './database'

type NoteRow = Record<string, SqlValue>

const COLUMNS = 'id, title, content_json, group_id, cover_image_path, created_at, updated_at'
const EMPTY_DOC = '[]'
const DEFAULT_TITLE = 'Untitled'

function nowIso(): string {
  return new Date().toISOString()
}

export function normalizeTitle(title: string | undefined): string {
  const trimmed = (title ?? '').trim()
  return trimmed === '' ? DEFAULT_TITLE : trimmed
}

function assertDocument(contentJson: string): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(contentJson)
  } catch {
    throw new Error('Note content is not valid JSON')
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Note content must be a BlockNote document (array of blocks)')
  }
}

function assertCoverPath(path: string): void {
  if (!path.startsWith('images/') || path.includes('..') || path.includes('\\')) {
    throw new Error('Invalid cover image path')
  }
}

function toNote(row: NoteRow): Note {
  const contentJson = String(row.content_json)
  return {
    id: String(row.id),
    title: String(row.title),
    contentJson,
    preview: makePreview(extractPlainText(contentJson)),
    groupId: typeof row.group_id === 'string' ? row.group_id : null,
    coverImagePath: typeof row.cover_image_path === 'string' ? row.cover_image_path : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }
}

function toSummary(row: NoteRow): NoteSummary {
  const { contentJson: _contentJson, ...summary } = toNote(row)
  void _contentJson
  return summary
}

/** Most recently edited first. */
export function listNotes(db: AppDatabase): NoteSummary[] {
  return db
    .all<NoteRow>(`SELECT ${COLUMNS} FROM notes ORDER BY updated_at DESC, created_at DESC`)
    .map(toSummary)
}

/**
 * Case-insensitive search over title + visible body text. Every word must match.
 * Matching runs on the extracted text (not raw JSON) so words like "paragraph"
 * or "props" don't hit BlockNote's own field names.
 */
export function searchNotes(db: AppDatabase, query: string): NoteSummary[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) {
    return listNotes(db)
  }
  return db
    .all<NoteRow>(`SELECT ${COLUMNS} FROM notes ORDER BY updated_at DESC, created_at DESC`)
    .filter((row) => {
      const haystack =
        `${String(row.title)}\n${extractPlainText(String(row.content_json))}`.toLowerCase()
      return terms.every((term) => haystack.includes(term))
    })
    .map(toSummary)
}

export function getNote(db: AppDatabase, id: string): Note {
  const row = db.get<NoteRow>(`SELECT ${COLUMNS} FROM notes WHERE id = ?`, [id])
  if (!row) {
    throw new Error('Note not found')
  }
  return toNote(row)
}

export function createNote(db: AppDatabase, input: NoteCreateInput = {}): Note {
  const contentJson = input.contentJson ?? EMPTY_DOC
  assertDocument(contentJson)
  const id = randomUUID()
  const now = nowIso()
  db.run(
    `INSERT INTO notes (id, title, content_json, group_id, cover_image_path, created_at, updated_at)
     VALUES (?, ?, ?, NULL, NULL, ?, ?)`,
    [id, normalizeTitle(input.title), contentJson, now, now]
  )
  return getNote(db, id)
}

export function updateNote(db: AppDatabase, input: NoteUpdateInput): Note {
  const current = getNote(db, input.id)
  const contentJson = input.contentJson ?? current.contentJson
  if (input.contentJson !== undefined) {
    assertDocument(contentJson)
  }
  db.run('UPDATE notes SET title = ?, content_json = ?, updated_at = ? WHERE id = ?', [
    input.title === undefined ? current.title : normalizeTitle(input.title),
    contentJson,
    nowIso(),
    input.id
  ])
  return getNote(db, input.id)
}

/**
 * Deletes the note and returns every image path it referenced (cover + inline),
 * so the caller can remove files that nothing else uses.
 */
export function deleteNote(db: AppDatabase, id: string): string[] {
  const note = getNote(db, id)
  db.run('DELETE FROM notes WHERE id = ?', [id])
  const candidates = new Set(extractInlineImagePaths(note.contentJson))
  if (note.coverImagePath) {
    candidates.add(note.coverImagePath)
  }
  return [...candidates]
}

/** Returns the updated note and the previous cover path (if any) for cleanup. */
export function setCover(
  db: AppDatabase,
  id: string,
  coverImagePath: string
): { note: Note; previous: string | null } {
  assertCoverPath(coverImagePath)
  const previous = getNote(db, id).coverImagePath
  db.run('UPDATE notes SET cover_image_path = ?, updated_at = ? WHERE id = ?', [
    coverImagePath,
    nowIso(),
    id
  ])
  return { note: getNote(db, id), previous }
}

export function clearCover(db: AppDatabase, id: string): { note: Note; previous: string | null } {
  const previous = getNote(db, id).coverImagePath
  db.run('UPDATE notes SET cover_image_path = NULL, updated_at = ? WHERE id = ?', [nowIso(), id])
  return { note: getNote(db, id), previous }
}
