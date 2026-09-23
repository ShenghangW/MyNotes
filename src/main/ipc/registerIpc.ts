import type { AppDatabase } from '../db/database'
import { registerAppHandlers } from './appHandlers'
import { registerCalendarHandlers } from './calendarHandlers'
import { registerImageHandlers } from './imagesHandlers'
import { registerNoteGroupsHandlers } from './noteGroupsHandlers'
import { registerNotesHandlers } from './notesHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerTimetableHandlers } from './timetableHandlers'
import { registerTodoHandlers } from './todoHandlers'

export function registerIpc(db: AppDatabase, userDataRoot: string): void {
  registerSettingsHandlers(db)
  registerNoteGroupsHandlers()
  registerNotesHandlers()
  registerTodoHandlers()
  registerCalendarHandlers()
  registerTimetableHandlers()
  registerImageHandlers(userDataRoot)
  registerAppHandlers(userDataRoot, db)
}
