import type { IpcResult } from '../../shared/api'

export function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}

export function fail(error: unknown): IpcResult<never> {
  return { ok: false, error: error instanceof Error ? error.message : String(error) }
}

export function notImplemented(): IpcResult<never> {
  return { ok: false, error: 'Not implemented yet' }
}

export function wrap<T>(fn: () => T): IpcResult<T> {
  try {
    return ok(fn())
  } catch (error) {
    return fail(error)
  }
}
