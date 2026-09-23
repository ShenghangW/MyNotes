import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/api'
import { notImplemented } from './result'

export function registerCalendarHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.eventsList, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.eventsGet, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.eventsCreate, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.eventsUpdate, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.eventsDelete, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.eventsListDueReminders, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.eventsDismissReminder, () => notImplemented())
}
