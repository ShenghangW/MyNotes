import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

/** Ensures the local SQLite/images folders exist under Electron userData. */
export function ensureUserDataDirs(): string {
  const root = app.getPath('userData')
  mkdirSync(join(root, 'images'), { recursive: true })
  return root
}
