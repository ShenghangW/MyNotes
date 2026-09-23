import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/api'
import { saveImageFromPath } from '../storage/imageStorage'
import { wrap } from './result'

export function registerImageHandlers(userDataRoot: string): void {
  ipcMain.handle(IPC_CHANNELS.imagesSaveFromPath, (_event, sourcePath: string) =>
    wrap(() => saveImageFromPath(userDataRoot, sourcePath))
  )
}
