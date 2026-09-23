import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/api'
import { notImplemented } from './result'

export function registerNotesHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.notesList, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.notesGet, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.notesCreate, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.notesUpdate, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.notesDelete, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.notesSearch, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.notesSetCover, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.notesClearCover, () => notImplemented())
}
