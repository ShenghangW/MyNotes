import { ipcMain } from 'electron'
import { IPC_CHANNELS, type NoteCreateInput, type NoteUpdateInput } from '../../shared/api'
import type { AppDatabase } from '../db/database'
import { notImplemented, wrap } from './result'

export function registerNotesHandlers(db: AppDatabase): void {
  ipcMain.handle(IPC_CHANNELS.notesList, () => wrap(() => db.listNotes()))
  ipcMain.handle(IPC_CHANNELS.notesGet, (_event, id: string) => wrap(() => db.getNote(id)))
  ipcMain.handle(IPC_CHANNELS.notesCreate, (_event, input: NoteCreateInput = {}) =>
    wrap(() => db.createNote(input))
  )
  ipcMain.handle(IPC_CHANNELS.notesUpdate, (_event, input: NoteUpdateInput) =>
    wrap(() => db.updateNote(input))
  )
  ipcMain.handle(IPC_CHANNELS.notesDelete, (_event, id: string) =>
    wrap(() => {
      db.deleteNote(id)
      return null
    })
  )
  // Deferred to a later slice: full-text search and cover images.
  ipcMain.handle(IPC_CHANNELS.notesSearch, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.notesSetCover, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.notesClearCover, () => notImplemented())
}
