import { ipcRenderer } from 'electron'
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
    list: () => invoke(IPC_CHANNELS.notesList),
    get: (payload) => invoke(IPC_CHANNELS.notesGet, payload),
    create: (payload) => invoke(IPC_CHANNELS.notesCreate, payload),
    update: (payload) => invoke(IPC_CHANNELS.notesUpdate, payload),
    delete: (payload) => invoke(IPC_CHANNELS.notesDelete, payload),
    search: (payload) => invoke(IPC_CHANNELS.notesSearch, payload),
    setCover: (payload) => invoke(IPC_CHANNELS.notesSetCover, payload),
    clearCover: (payload) => invoke(IPC_CHANNELS.notesClearCover, payload)
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
    upsert: (payload) => invoke(IPC_CHANNELS.timetableUpsert, payload),
    delete: (payload) => invoke(IPC_CHANNELS.timetableDelete, payload)
  },
  images: {
    saveFromPath: (sourcePath) => invoke(IPC_CHANNELS.imagesSaveFromPath, sourcePath)
  },
  app: {
    getUserDataPath: () => invoke(IPC_CHANNELS.appGetUserDataPath),
    manualSave: () => invoke(IPC_CHANNELS.appManualSave)
  }
}
