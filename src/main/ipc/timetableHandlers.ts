import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/api'
import { notImplemented } from './result'

export function registerTimetableHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.timetableList, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.timetableUpsert, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.timetableDelete, () => notImplemented())
}
