/**
 * Registry of everything that may hold unsaved edits (today: each open note's autosave).
 * Ctrl+S, the save indicator and window close all go through here.
 */
type Saver = { flush: () => Promise<void>; pending: boolean }

const savers = new Set<Saver>()
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

export function registerSaver(flush: () => Promise<void>): {
  setPending: (pending: boolean) => void
  unregister: () => void
} {
  const saver: Saver = { flush, pending: false }
  savers.add(saver)
  return {
    setPending: (pending) => {
      if (saver.pending !== pending) {
        saver.pending = pending
        emit()
      }
    },
    unregister: () => {
      if (savers.delete(saver)) {
        emit()
      }
    }
  }
}

export function hasPendingSaves(): boolean {
  for (const saver of savers) {
    if (saver.pending) {
      return true
    }
  }
  return false
}

export function subscribePendingSaves(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Saves every pending edit now; resolves once all of them are written. */
export async function flushAllSaves(): Promise<void> {
  await Promise.all([...savers].map((saver) => saver.flush()))
}
