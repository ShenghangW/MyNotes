import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/api'
import { notImplemented } from './result'

export function registerNoteGroupsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.groupsList, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.groupsCreate, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.groupsRename, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.groupsDelete, () => notImplemented())
}
