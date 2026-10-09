import { ipcMain } from 'electron'
import type {
  EventCreateInput,
  EventIdInput,
  EventUpdateInput,
  ReminderDismissInput
} from '../../shared/api'
import { IPC_CHANNELS } from '../../shared/api'
import type { AppDatabase } from '../db/database'
import {
  createEvent,
  deleteEvent,
  dismissReminder,
  getEvent,
  listDueReminders,
  listEvents,
  updateEvent
} from '../db/eventsRepository'
import { wrap } from './result'

/** Local calendar date (not UTC) so "today" matches the user's clock. */
function localToday(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function registerCalendarHandlers(db: AppDatabase): void {
  ipcMain.handle(IPC_CHANNELS.eventsList, () => wrap(() => listEvents(db)))
  ipcMain.handle(IPC_CHANNELS.eventsGet, (_event, payload: EventIdInput) =>
    wrap(() => getEvent(db, payload.id))
  )
  ipcMain.handle(IPC_CHANNELS.eventsCreate, (_event, payload: EventCreateInput) =>
    wrap(() => createEvent(db, payload))
  )
  ipcMain.handle(IPC_CHANNELS.eventsUpdate, (_event, payload: EventUpdateInput) =>
    wrap(() => updateEvent(db, payload))
  )
  ipcMain.handle(IPC_CHANNELS.eventsDelete, (_event, payload: EventIdInput) =>
    wrap(() => {
      deleteEvent(db, payload.id)
      return null
    })
  )
  ipcMain.handle(IPC_CHANNELS.eventsListDueReminders, () =>
    wrap(() => listDueReminders(db, localToday()))
  )
  ipcMain.handle(IPC_CHANNELS.eventsDismissReminder, (_event, payload: ReminderDismissInput) =>
    wrap(() => {
      dismissReminder(db, payload.eventId, localToday())
      return null
    })
  )
}
