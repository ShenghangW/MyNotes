import { app, shell, BrowserWindow, net, protocol } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { openDatabase, type AppDatabase } from './db/database'
import { registerIpc } from './ipc/registerIpc'
import { ensureUserDataDirs } from './userData'
import { resolveImagePath } from './storage/imageProtocol'
import { APP_IMAGE_SCHEME } from '../shared/imageUrl'

// Must run before the app is ready. Lets <img src="app-image://..."> load local files
// without loosening webSecurity.
protocol.registerSchemesAsPrivileged([
  { scheme: APP_IMAGE_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

let db: AppDatabase | null = null

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    show: false,
    title: 'myNote',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.mynote.app')
  const userDataRoot = ensureUserDataDirs()
  db = await openDatabase(userDataRoot)
  registerIpc(db, userDataRoot)

  protocol.handle(APP_IMAGE_SCHEME, (request) => {
    const file = resolveImagePath(userDataRoot, request.url)
    return file
      ? net.fetch(pathToFileURL(file).toString())
      : new Response('Not found', { status: 404 })
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  db?.close()
  db = null
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
