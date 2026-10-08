import { ipcMain } from 'electron'
import type { GroupIdInput, GroupNameInput, GroupRenameInput } from '../../shared/api'
import { IPC_CHANNELS } from '../../shared/api'
import type { AppDatabase } from '../db/database'
import { createGroup, deleteGroup, listGroups, renameGroup } from '../db/groupsRepository'
import { wrap } from './result'

export function registerNoteGroupsHandlers(db: AppDatabase): void {
  ipcMain.handle(IPC_CHANNELS.groupsList, () => wrap(() => listGroups(db)))
  ipcMain.handle(IPC_CHANNELS.groupsCreate, (_event, payload: GroupNameInput) =>
    wrap(() => createGroup(db, payload.name))
  )
  ipcMain.handle(IPC_CHANNELS.groupsRename, (_event, payload: GroupRenameInput) =>
    wrap(() => renameGroup(db, payload.id, payload.name))
  )
  ipcMain.handle(IPC_CHANNELS.groupsDelete, (_event, payload: GroupIdInput) =>
    wrap(() => {
      deleteGroup(db, payload.id)
      return null
    })
  )
}
