import { ipcMain, shell } from 'electron'
import { IPC_CHANNELS } from '../../shared/api'
import { fail, ok, wrap } from './result'
import type { AppDatabase } from '../db/database'

export function registerAppHandlers(userDataRoot: string, db: AppDatabase): void {
  ipcMain.handle(IPC_CHANNELS.appGetUserDataPath, () => wrap(() => userDataRoot))
  ipcMain.handle(IPC_CHANNELS.appOpenUserDataFolder, async () => {
    // shell.openPath resolves to an error message, or '' on success.
    const message = await shell.openPath(userDataRoot)
    return message ? fail(message) : ok(null)
  })
  ipcMain.handle(IPC_CHANNELS.appManualSave, () =>
    wrap(() => {
      db.persist()
      return null
    })
  )
}
