import { app, shell, BrowserWindow, ipcMain, net, protocol, type IpcMainEvent } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { openDatabase, type AppDatabase } from './db/database'
import { registerIpc } from './ipc/registerIpc'
import { ensureUserDataDirs } from './userData'
import { resolveImagePath } from './storage/imageProtocol'
import { IPC_CHANNELS } from '../shared/api'
import { computeZoomFactor, nextUserZoom } from './zoom'
import { APP_IMAGE_SCHEME } from '../shared/imageUrl'

// Must run before the app is ready. Lets <img src="app-image://..."> load local files
// without loosening webSecurity.
protocol.registerSchemesAsPrivileged([
  { scheme: APP_IMAGE_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

// Longest the window waits for the page to flush unsaved edits before closing anyway.
const CLOSE_FLUSH_TIMEOUT_MS = 3000

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

  // The UI scales with the window (so a maximised window isn't tiny); Ctrl +/-/0 adjusts on top.
  let userZoom = 1
  const applyZoom = (): void => {
    const [width, height] = mainWindow.getContentSize()
    mainWindow.webContents.setZoomFactor(computeZoomFactor(width, height, userZoom))
  }
  mainWindow.on('resize', applyZoom)
  mainWindow.on('maximize', applyZoom)
  mainWindow.on('unmaximize', applyZoom)
  mainWindow.on('enter-full-screen', applyZoom)
  mainWindow.on('leave-full-screen', applyZoom)
  // Windows reports the mouse side buttons (and browser keys) as app commands.
  mainWindow.on('app-command', (_event, command) => {
    if (command === 'browser-backward') {
      mainWindow.webContents.send(IPC_CHANNELS.navCommand, 'back')
    } else if (command === 'browser-forward') {
      mainWindow.webContents.send(IPC_CHANNELS.navCommand, 'forward')
    }
  })
  mainWindow.webContents.on('did-finish-load', applyZoom)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !(input.control || input.meta)) {
      return
    }
    const next = nextUserZoom(userZoom, input.key)
    if (next !== null) {
      event.preventDefault()
      userZoom = next
      applyZoom()
    }
  })
  void mainWindow.webContents.setVisualZoomLevelLimits(1, 1)

  mainWindow.on('ready-to-show', () => {
    applyZoom()
    mainWindow.show()
  })

  // Closing waits for the page to flush any unsaved edits (with a time limit so it can't hang).
  let closeApproved = false
  let closeRequested = false
  let closeTimer: ReturnType<typeof setTimeout> | null = null
  const approveClose = (): void => {
    if (closeTimer !== null) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
    if (!mainWindow.isDestroyed()) {
      closeApproved = true
      mainWindow.close()
    }
  }
  const onCloseReady = (event: IpcMainEvent): void => {
    if (event.sender === mainWindow.webContents) {
      approveClose()
    }
  }
  ipcMain.on(IPC_CHANNELS.appCloseReady, onCloseReady)
  mainWindow.on('close', (event) => {
    const page = mainWindow.webContents
    if (closeApproved || page.isCrashed() || page.isLoading()) {
      return
    }
    event.preventDefault()
    if (closeRequested) {
      return
    }
    closeRequested = true
    page.send(IPC_CHANNELS.beforeClose)
    closeTimer = setTimeout(approveClose, CLOSE_FLUSH_TIMEOUT_MS)
  })
  mainWindow.on('closed', () => {
    ipcMain.removeListener(IPC_CHANNELS.appCloseReady, onCloseReady)
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

// Keep Chromium's own UI (date pickers etc.) in English, with day/month/year order.
app.commandLine.appendSwitch('lang', 'en-AU')

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
