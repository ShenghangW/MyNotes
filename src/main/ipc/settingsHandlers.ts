import { ipcMain } from 'electron'
import { IPC_CHANNELS, type SettingsPatch } from '../../shared/api'
import type { AppDatabase } from '../db/database'
import { deleteIfUnreferenced } from '../storage/imageStorage'
import { wrap } from './result'

export function registerSettingsHandlers(db: AppDatabase, userDataRoot: string): void {
  ipcMain.handle(IPC_CHANNELS.settingsGet, () => wrap(() => db.getSettings()))
  ipcMain.handle(IPC_CHANNELS.settingsUpdate, (_event, patch: SettingsPatch) =>
    wrap(() => {
      const previousPhoto = db.getSettings().homePhotoPath
      const saved = db.updateSettings(patch)
      // A replaced or removed Home photo's file goes too, unless a note still uses it.
      if (previousPhoto && previousPhoto !== saved.homePhotoPath) {
        deleteIfUnreferenced(userDataRoot, previousPhoto, db.referencedImagePaths())
      }
      return saved
    })
  )
}
