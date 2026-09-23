import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/api'
import { wrap } from './result'
import type { AppDatabase } from '../db/database'

export function registerAppHandlers(userDataRoot: string, db: AppDatabase): void {
  ipcMain.handle(IPC_CHANNELS.appGetUserDataPath, () => wrap(() => userDataRoot))
  ipcMain.handle(IPC_CHANNELS.appManualSave, () =>
    wrap(() => {
      db.persist()
      return null
    })
  )
}
