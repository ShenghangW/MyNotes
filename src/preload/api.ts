import { ipcRenderer, webUtils } from 'electron'
import { IPC_CHANNELS, type AppApi } from '../shared/api'

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>
}

export const api: AppApi = {
  settings: {
    get: () => invoke(IPC_CHANNELS.settingsGet),
    update: (patch) => invoke(IPC_CHANNELS.settingsUpdate, patch)
  },
  groups: {
    list: () => invoke(IPC_CHANNELS.groupsList),
    create: (payload) => invoke(IPC_CHANNELS.groupsCreate, payload),
    rename: (payload) => invoke(IPC_CHANNELS.groupsRename, payload),
    delete: (payload) => invoke(IPC_CHANNELS.groupsDelete, payload)
  },
  notes: {
    list: (payload) => invoke(IPC_CHANNELS.notesList, payload),
    get: (payload) => invoke(IPC_CHANNELS.notesGet, payload),
    create: (payload) => invoke(IPC_CHANNELS.notesCreate, payload),
    update: (payload) => invoke(IPC_CHANNELS.notesUpdate, payload),
    delete: (payload) => invoke(IPC_CHANNELS.notesDelete, payload),
    search: (payload) => invoke(IPC_CHANNELS.notesSearch, payload),
    setCover: (payload) => invoke(IPC_CHANNELS.notesSetCover, payload),
    clearCover: (payload) => invoke(IPC_CHANNELS.notesClearCover, payload),
    exportPdf: (payload) => invoke(IPC_CHANNELS.notesExportPdf, payload)
  },
  todos: {
    list: () => invoke(IPC_CHANNELS.todosList),
    create: (payload) => invoke(IPC_CHANNELS.todosCreate, payload),
    update: (payload) => invoke(IPC_CHANNELS.todosUpdate, payload),
    delete: (payload) => invoke(IPC_CHANNELS.todosDelete, payload),
    reorder: (payload) => invoke(IPC_CHANNELS.todosReorder, payload)
  },
  events: {
    list: () => invoke(IPC_CHANNELS.eventsList),
    get: (payload) => invoke(IPC_CHANNELS.eventsGet, payload),
    create: (payload) => invoke(IPC_CHANNELS.eventsCreate, payload),
    update: (payload) => invoke(IPC_CHANNELS.eventsUpdate, payload),
    delete: (payload) => invoke(IPC_CHANNELS.eventsDelete, payload),
    listDueReminders: () => invoke(IPC_CHANNELS.eventsListDueReminders),
    dismissReminder: (payload) => invoke(IPC_CHANNELS.eventsDismissReminder, payload)
  },
  timetable: {
    list: () => invoke(IPC_CHANNELS.timetableList),
    create: (payload) => invoke(IPC_CHANNELS.timetableCreate, payload),
    update: (payload) => invoke(IPC_CHANNELS.timetableUpdate, payload),
    delete: (payload) => invoke(IPC_CHANNELS.timetableDelete, payload)
  },
  images: {
    saveFromPath: (sourcePath) => invoke(IPC_CHANNELS.imagesSaveFromPath, sourcePath),
    saveFromBytes: (bytes) => invoke(IPC_CHANNELS.imagesSaveFromBytes, bytes),
    pathForFile: (file) => webUtils.getPathForFile(file)
  },
  app: {
    getUserDataPath: () => invoke(IPC_CHANNELS.appGetUserDataPath),
    manualSave: () => invoke(IPC_CHANNELS.appManualSave),
    openUserDataFolder: () => invoke(IPC_CHANNELS.appOpenUserDataFolder),
    onNavigate: (listener) => {
      const handler = (_event: unknown, direction: 'back' | 'forward'): void => listener(direction)
      ipcRenderer.on(IPC_CHANNELS.navCommand, handler)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.navCommand, handler)
      }
    },
    onBeforeClose: (listener) => {
      const handler = async (): Promise<void> => {
        try {
          await listener()
        } finally {
          ipcRenderer.send(IPC_CHANNELS.appCloseReady)
        }
      }
      ipcRenderer.on(IPC_CHANNELS.beforeClose, handler)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.beforeClose, handler)
      }
    }
  }
}
