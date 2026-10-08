import type { IpcResult } from '@shared/api'

/** Turns an `{ ok: false }` IPC result into a thrown Error. */
export function unwrap<T>(result: IpcResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.data
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
