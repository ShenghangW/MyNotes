import { ipcMain } from 'electron'
import type { TimetableCreateInput, TimetableIdInput, TimetableUpdateInput } from '../../shared/api'
import { IPC_CHANNELS } from '../../shared/api'
import type { AppDatabase } from '../db/database'
import {
  createTimetableEntries,
  deleteTimetableEntry,
  listTimetable,
  updateTimetableEntry
} from '../db/timetableRepository'
import { wrap } from './result'

export function registerTimetableHandlers(db: AppDatabase): void {
  ipcMain.handle(IPC_CHANNELS.timetableList, () => wrap(() => listTimetable(db)))
  ipcMain.handle(IPC_CHANNELS.timetableCreate, (_event, payload: TimetableCreateInput) =>
    wrap(() => createTimetableEntries(db, payload))
  )
  ipcMain.handle(IPC_CHANNELS.timetableUpdate, (_event, payload: TimetableUpdateInput) =>
    wrap(() => updateTimetableEntry(db, payload))
  )
  ipcMain.handle(IPC_CHANNELS.timetableDelete, (_event, payload: TimetableIdInput) =>
    wrap(() => {
      deleteTimetableEntry(db, payload.id)
      return null
    })
  )
}
