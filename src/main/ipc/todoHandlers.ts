import { ipcMain } from 'electron'
import type {
  TodoCreateInput,
  TodoIdInput,
  TodoReorderInput,
  TodoUpdateInput
} from '../../shared/api'
import { IPC_CHANNELS } from '../../shared/api'
import type { AppDatabase } from '../db/database'
import { createTodo, deleteTodo, listTodos, reorderTodos, updateTodo } from '../db/todosRepository'
import { wrap } from './result'

export function registerTodoHandlers(db: AppDatabase): void {
  ipcMain.handle(IPC_CHANNELS.todosList, () => wrap(() => listTodos(db)))
  ipcMain.handle(IPC_CHANNELS.todosCreate, (_event, payload: TodoCreateInput) =>
    wrap(() => createTodo(db, payload))
  )
  ipcMain.handle(IPC_CHANNELS.todosUpdate, (_event, payload: TodoUpdateInput) =>
    wrap(() => updateTodo(db, payload))
  )
  ipcMain.handle(IPC_CHANNELS.todosDelete, (_event, payload: TodoIdInput) =>
    wrap(() => {
      deleteTodo(db, payload.id)
      return null
    })
  )
  ipcMain.handle(IPC_CHANNELS.todosReorder, (_event, payload: TodoReorderInput) =>
    wrap(() => reorderTodos(db, payload.ids))
  )
}
