import type { AppDatabase } from '../db/database'
import { registerAppHandlers } from './appHandlers'
import { registerExportHandlers } from '../export/exportHandlers'
import { registerCalendarHandlers } from './calendarHandlers'
import { registerImageHandlers } from './imagesHandlers'
import { registerNoteGroupsHandlers } from './noteGroupsHandlers'
import { registerNotesHandlers } from './notesHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerTimetableHandlers } from './timetableHandlers'
import { registerTodoHandlers } from './todoHandlers'

export function registerIpc(db: AppDatabase, userDataRoot: string): void {
  registerSettingsHandlers(db, userDataRoot)
  registerNoteGroupsHandlers(db)
  registerNotesHandlers(db, userDataRoot)
  registerTodoHandlers(db)
  registerCalendarHandlers(db)
  registerTimetableHandlers(db)
  registerImageHandlers(userDataRoot)
  registerExportHandlers(userDataRoot)
  registerAppHandlers(userDataRoot, db)
}
