import type { AppApi, AppSettings, IpcResult } from '../shared/api'

const notImplemented = async (): Promise<IpcResult<never>> => ({
  ok: false,
  error: 'Not implemented yet'
})

const defaultSettings: AppSettings = {
  reminderLeadDays: 1,
  homeTitle: 'Home',
  homePhotoPath: null,
  homePhotoVisible: true,
  updatedAt: '2026-01-01T00:00:00.000Z'
}

export const TEST_USER_DATA_PATH = 'C:\\Users\\test\\AppData\\Roaming\\myNote'

export function createMockApi(overrides: Partial<AppApi> = {}): AppApi {
  return {
    settings: {
      get: async () => ({ ok: true, data: defaultSettings }),
      update: notImplemented
    },
    groups: {
      list: async () => ({ ok: true, data: [] }),
      create: notImplemented,
      rename: notImplemented,
      delete: notImplemented
    },
    notes: {
      list: async () => ({ ok: true, data: [] }),
      get: notImplemented,
      create: notImplemented,
      update: notImplemented,
      delete: notImplemented,
      search: notImplemented,
      setCover: notImplemented,
      clearCover: notImplemented
    },
    todos: {
      list: async () => ({ ok: true, data: [] }),
      create: notImplemented,
      update: notImplemented,
      delete: notImplemented,
      reorder: notImplemented
    },
    events: {
      list: async () => ({ ok: true, data: [] }),
      get: notImplemented,
      create: notImplemented,
      update: notImplemented,
      delete: notImplemented,
      listDueReminders: async () => ({ ok: true, data: [] }),
      dismissReminder: notImplemented
    },
    timetable: {
      list: async () => ({ ok: true, data: [] }),
      create: notImplemented,
      update: notImplemented,
      delete: notImplemented
    },
    images: {
      saveFromPath: notImplemented,
      pathForFile: () => ''
    },
    app: {
      getUserDataPath: async () => ({ ok: true, data: TEST_USER_DATA_PATH }),
      manualSave: async () => ({ ok: true, data: null }),
      openUserDataFolder: async () => ({ ok: true, data: null }),
      onNavigate: () => () => undefined,
      onBeforeClose: () => () => undefined
    },
    ...overrides
  }
}
