import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/api'
import { notImplemented } from './result'

export function registerTodoHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.todosList, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.todosCreate, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.todosUpdate, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.todosDelete, () => notImplemented())
  ipcMain.handle(IPC_CHANNELS.todosReorder, () => notImplemented())
}
