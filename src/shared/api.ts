import type { EventColorId } from './eventColors'

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

export const DEFAULT_HOME_TITLE = 'Home'
export const MAX_HOME_TITLE_LENGTH = 60

export type AppSettings = {
  reminderLeadDays: 1 | 2
  /** Heading shown at the top of the Home page. User-editable. */
  homeTitle: string
  homePhotoPath: string | null
  homePhotoVisible: boolean
  updatedAt: string
}

export type SettingsPatch = Partial<
  Pick<AppSettings, 'reminderLeadDays' | 'homeTitle' | 'homePhotoPath' | 'homePhotoVisible'>
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

export type CalendarEvent = {
  id: string
  title: string
  /** `YYYY-MM-DD`. Events can span several days, weeks or months. */
  startDate: string
  /** 24-hour `HH:MM`, or null for an all-day event. */
  startTime: string | null
  endDate: string
  endTime: string | null
  allDay: boolean
  color: EventColorId
  reminderEnabled: boolean
  /** Id of the to-do created from this event (shown on the Home list), or null. */
  todoId: string | null
  createdAt: string
  updatedAt: string
}

export type EventCreateInput = {
  title: string
  startDate: string
  /** Defaults to the start date. */
  endDate?: string
  startTime?: string | null
  endTime?: string | null
  /** Defaults to true when no start time is given. */
  allDay?: boolean
  color?: EventColorId
  reminderEnabled?: boolean
  /** Also create a to-do (due on the start date). Off by default. */
  addToTodo?: boolean
}
export type EventUpdateInput = Partial<EventCreateInput> & { id: string }
export type EventIdInput = { id: string }

/** An event whose reminder popup should show today. */
export type DueReminder = {
  event: CalendarEvent
  /** 0 = today, 1 = tomorrow, 2 = in two days. */
  daysUntil: number
}
export type ReminderDismissInput = { eventId: string }

export type TimetableEntry = {
  id: string
  /** 0 = Monday … 6 = Sunday. */
  dayOfWeek: number
  /** 24-hour `HH:MM`. */
  startTime: string
  endTime: string
  title: string
  /** Optional extra detail, e.g. the room or lecturer. */
  description: string | null
  color: EventColorId
  updatedAt: string
}

export type TimetableCreateInput = {
  title: string
  /** One entry is created per day (0 = Monday … 6 = Sunday). */
  days: number[]
  startTime: string
  endTime: string
  description?: string | null
  color?: EventColorId
}
export type TimetableUpdateInput = {
  id: string
  title?: string
  dayOfWeek?: number
  startTime?: string
  endTime?: string
  /** null or empty clears the description; omit to keep it. */
  description?: string | null
  color?: EventColorId
}
export type TimetableIdInput = { id: string }

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
    list: () => Promise<IpcResult<CalendarEvent[]>>
    get: (payload: EventIdInput) => Promise<IpcResult<CalendarEvent>>
    create: (payload: EventCreateInput) => Promise<IpcResult<CalendarEvent>>
    update: (payload: EventUpdateInput) => Promise<IpcResult<CalendarEvent>>
    delete: (payload: EventIdInput) => Promise<IpcResult<null>>
    /** Reminders due today (local date) that have not been dismissed today. */
    listDueReminders: () => Promise<IpcResult<DueReminder[]>>
    /** Hides this event's reminder for the rest of today (local date). */
    dismissReminder: (payload: ReminderDismissInput) => Promise<IpcResult<null>>
  }
  timetable: {
    list: () => Promise<IpcResult<TimetableEntry[]>>
    /** Adds the class on every selected day; returns the new entries. */
    create: (payload: TimetableCreateInput) => Promise<IpcResult<TimetableEntry[]>>
    update: (payload: TimetableUpdateInput) => Promise<IpcResult<TimetableEntry>>
    delete: (payload: TimetableIdInput) => Promise<IpcResult<null>>
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
    /** Opens the data folder in the system file manager (Explorer on Windows). */
    openUserDataFolder: () => Promise<IpcResult<null>>
    /** Mouse side buttons / browser keys, reported by the OS. Returns an unsubscribe function. */
    onNavigate: (listener: (direction: 'back' | 'forward') => void) => () => void
    /**
     * Called when the window is about to close. The window waits for the returned promise
     * (up to a short time limit) so unsaved edits can be flushed first.
     */
    onBeforeClose: (listener: () => Promise<void>) => () => void
  }
}

export const IPC_CHANNELS = {
  navCommand: 'nav:command',
  beforeClose: 'app:before-close',
  appCloseReady: 'app:close-ready',
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
  timetableCreate: 'timetable:create',
  timetableUpdate: 'timetable:update',
  timetableDelete: 'timetable:delete',
  imagesSaveFromPath: 'images:saveFromPath',
  appGetUserDataPath: 'app:getUserDataPath',
  appManualSave: 'app:manualSave',
  appOpenUserDataFolder: 'app:openUserDataFolder'
} as const
