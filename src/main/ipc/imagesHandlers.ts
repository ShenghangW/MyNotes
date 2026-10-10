import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/api'
import { saveImageFromBytes, saveImageFromPath } from '../storage/imageStorage'
import { fail, ok } from './result'

const IMAGE_FILTER = {
  name: 'Images',
  extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']
}

export function registerImageHandlers(userDataRoot: string): void {
  ipcMain.handle(IPC_CHANNELS.imagesSaveFromPath, async (event, sourcePath?: string) => {
    try {
      let chosen = typeof sourcePath === 'string' && sourcePath !== '' ? sourcePath : null
      if (chosen === null) {
        // No path given: the picker lives in main so the renderer never names arbitrary files.
        const parent = BrowserWindow.fromWebContents(event.sender)
        const options = { properties: ['openFile' as const], filters: [IMAGE_FILTER] }
        const result = parent
          ? await dialog.showOpenDialog(parent, options)
          : await dialog.showOpenDialog(options)
        if (result.canceled || result.filePaths.length === 0) {
          return ok<string | null>(null)
        }
        chosen = result.filePaths[0]
      }
      return ok<string | null>(saveImageFromPath(userDataRoot, chosen))
    } catch (error) {
      return fail(error)
    }
  })
  ipcMain.handle(IPC_CHANNELS.imagesSaveFromBytes, (_event, bytes: unknown) => {
    try {
      return ok(saveImageFromBytes(userDataRoot, bytes as Uint8Array))
    } catch (error) {
      return fail(error)
    }
  })
}
