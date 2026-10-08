import { ipcMain } from 'electron'
import type {
  NoteCreateInput,
  NoteIdInput,
  NoteSearchInput,
  NoteSetCoverInput,
  NoteUpdateInput
} from '../../shared/api'
import { IPC_CHANNELS } from '../../shared/api'
import type { AppDatabase } from '../db/database'
import {
  clearCover,
  createNote,
  deleteNote,
  getNote,
  listNotes,
  searchNotes,
  setCover,
  updateNote
} from '../db/notesRepository'
import { deleteIfUnreferenced } from '../storage/imageStorage'
import { wrap } from './result'

/** Removes image files that no note, cover, or setting references any more. */
function cleanupImages(
  db: AppDatabase,
  userDataRoot: string,
  candidates: Array<string | null>
): void {
  const referenced = db.referencedImagePaths()
  for (const path of candidates) {
    if (path) {
      deleteIfUnreferenced(userDataRoot, path, referenced)
    }
  }
}

export function registerNotesHandlers(db: AppDatabase, userDataRoot: string): void {
  ipcMain.handle(IPC_CHANNELS.notesList, () => wrap(() => listNotes(db)))
  ipcMain.handle(IPC_CHANNELS.notesGet, (_event, payload: NoteIdInput) =>
    wrap(() => getNote(db, payload.id))
  )
  ipcMain.handle(IPC_CHANNELS.notesCreate, (_event, payload?: NoteCreateInput) =>
    wrap(() => createNote(db, payload ?? {}))
  )
  ipcMain.handle(IPC_CHANNELS.notesUpdate, (_event, payload: NoteUpdateInput) =>
    wrap(() => updateNote(db, payload))
  )
  ipcMain.handle(IPC_CHANNELS.notesDelete, (_event, payload: NoteIdInput) =>
    wrap(() => {
      const candidates = deleteNote(db, payload.id)
      cleanupImages(db, userDataRoot, candidates)
      return null
    })
  )
  ipcMain.handle(IPC_CHANNELS.notesSearch, (_event, payload: NoteSearchInput) =>
    wrap(() => searchNotes(db, payload?.query ?? ''))
  )
  ipcMain.handle(IPC_CHANNELS.notesSetCover, (_event, payload: NoteSetCoverInput) =>
    wrap(() => {
      const { note, previous } = setCover(db, payload.id, payload.coverImagePath)
      cleanupImages(db, userDataRoot, [previous])
      return note
    })
  )
  ipcMain.handle(IPC_CHANNELS.notesClearCover, (_event, payload: NoteIdInput) =>
    wrap(() => {
      const { note, previous } = clearCover(db, payload.id)
      cleanupImages(db, userDataRoot, [previous])
      return note
    })
  )
}
