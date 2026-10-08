export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

export type AppSettings = {
  reminderLeadDays: 1 | 2
  homePhotoPath: string | null
  homePhotoVisible: boolean
  updatedAt: string
}

export type SettingsPatch = Partial<
  Pick<AppSettings, 'reminderLeadDays' | 'homePhotoPath' | 'homePhotoVisible'>
>

export type NoteGroup = {
  id: string
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type GroupNameInput = { name: string }
export type GroupRenameInput = { id: string; name: string }
export type GroupIdInput = { id: string }

/** undefined = all notes, null = ungrouped only, string = that group's notes. */
export type NotesFilter = { groupId?: string | null }

export type NoteSummary = {
  id: string
  title: string
  /** Plain-text excerpt of the body, for list/grid cards. */
  preview: string
  groupId: string | null
  /** Relative path under userData, e.g. `images/{uuid}.png`. */
  coverImagePath: string | null
  createdAt: string
  updatedAt: string
}

export type Note = NoteSummary & {
  /** BlockNote document JSON (array of blocks). */
  contentJson: string
}

export type NoteCreateInput = {
  title?: string
  contentJson?: string
  groupId?: string | null
}

export type NoteUpdateInput = {
  id: string
  title?: string
  contentJson?: string
  groupId?: string | null
}

export type NoteSearchInput = NotesFilter & { query: string }
export type NoteIdInput = { id: string }
export type NoteSetCoverInput = { id: string; coverImagePath: string }

export type Todo = {
  id: string
  text: string
  done: boolean
  /** `YYYY-MM-DD` (local calendar date) or null. */
  dueDate: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type TodoCreateInput = { text: string; dueDate?: string | null }
export type TodoUpdateInput = {
  id: string
  text?: string
  done?: boolean
  /** null clears the due date; omit to keep it. */
  dueDate?: string | null
}
export type TodoIdInput = { id: string }
export type TodoReorderInput = { ids: string[] }

export type AppApi = {
  settings: {
    get: () => Promise<IpcResult<AppSettings>>
    update: (patch: SettingsPatch) => Promise<IpcResult<AppSettings>>
  }
  groups: {
    list: () => Promise<IpcResult<NoteGroup[]>>
    create: (payload: GroupNameInput) => Promise<IpcResult<NoteGroup>>
    rename: (payload: GroupRenameInput) => Promise<IpcResult<NoteGroup>>
    /** Notes in the group are kept and become ungrouped. */
    delete: (payload: GroupIdInput) => Promise<IpcResult<null>>
  }
  notes: {
    list: (payload?: NotesFilter) => Promise<IpcResult<NoteSummary[]>>
    get: (payload: NoteIdInput) => Promise<IpcResult<Note>>
    create: (payload?: NoteCreateInput) => Promise<IpcResult<Note>>
    update: (payload: NoteUpdateInput) => Promise<IpcResult<Note>>
    delete: (payload: NoteIdInput) => Promise<IpcResult<null>>
    search: (payload: NoteSearchInput) => Promise<IpcResult<NoteSummary[]>>
    setCover: (payload: NoteSetCoverInput) => Promise<IpcResult<Note>>
    clearCover: (payload: NoteIdInput) => Promise<IpcResult<Note>>
  }
  todos: {
    list: () => Promise<IpcResult<Todo[]>>
    create: (payload: TodoCreateInput) => Promise<IpcResult<Todo>>
    update: (payload: TodoUpdateInput) => Promise<IpcResult<Todo>>
    delete: (payload: TodoIdInput) => Promise<IpcResult<null>>
    /** Listed ids come first in the given order; any others keep their order after them. */
    reorder: (payload: TodoReorderInput) => Promise<IpcResult<Todo[]>>
  }
  events: {
    list: () => Promise<IpcResult<unknown>>
    get: (payload: unknown) => Promise<IpcResult<unknown>>
    create: (payload: unknown) => Promise<IpcResult<unknown>>
    update: (payload: unknown) => Promise<IpcResult<unknown>>
    delete: (payload: unknown) => Promise<IpcResult<unknown>>
    listDueReminders: () => Promise<IpcResult<unknown>>
    dismissReminder: (payload: unknown) => Promise<IpcResult<unknown>>
  }
  timetable: {
    list: () => Promise<IpcResult<unknown>>
    upsert: (payload: unknown) => Promise<IpcResult<unknown>>
    delete: (payload: unknown) => Promise<IpcResult<unknown>>
  }
  images: {
    /**
     * Copies an image into userData/images and returns its relative path.
     * With no argument, the main process shows the native file picker
     * (resolves to `null` if the user cancels).
     */
    saveFromPath: (sourcePath?: string) => Promise<IpcResult<string | null>>
    /** Absolute path of a File chosen in the UI (drag-drop / <input>). Empty if it has none. */
    pathForFile: (file: File) => string
  }
  app: {
    getUserDataPath: () => Promise<IpcResult<string>>
    manualSave: () => Promise<IpcResult<null>>
  }
}

export const IPC_CHANNELS = {
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  groupsList: 'groups:list',
  groupsCreate: 'groups:create',
  groupsRename: 'groups:rename',
  groupsDelete: 'groups:delete',
  notesList: 'notes:list',
  notesGet: 'notes:get',
  notesCreate: 'notes:create',
  notesUpdate: 'notes:update',
  notesDelete: 'notes:delete',
  notesSearch: 'notes:search',
  notesSetCover: 'notes:setCover',
  notesClearCover: 'notes:clearCover',
  todosList: 'todos:list',
  todosCreate: 'todos:create',
  todosUpdate: 'todos:update',
  todosDelete: 'todos:delete',
  todosReorder: 'todos:reorder',
  eventsList: 'events:list',
  eventsGet: 'events:get',
  eventsCreate: 'events:create',
  eventsUpdate: 'events:update',
  eventsDelete: 'events:delete',
  eventsListDueReminders: 'events:listDueReminders',
  eventsDismissReminder: 'events:dismissReminder',
  timetableList: 'timetable:list',
  timetableUpsert: 'timetable:upsert',
  timetableDelete: 'timetable:delete',
  imagesSaveFromPath: 'images:saveFromPath',
  appGetUserDataPath: 'app:getUserDataPath',
  appManualSave: 'app:manualSave'
} as const
