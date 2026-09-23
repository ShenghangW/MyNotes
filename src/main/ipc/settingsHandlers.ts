import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/api'
import type { AppDatabase } from '../db/database'
import { wrap } from './result'

export function registerSettingsHandlers(db: AppDatabase): void {
  ipcMain.handle(IPC_CHANNELS.settingsGet, () => wrap(() => db.getSettings()))
  ipcMain.handle(IPC_CHANNELS.settingsUpdate, (_event, patch) => wrap(() => db.updateSettings(patch)))
}
