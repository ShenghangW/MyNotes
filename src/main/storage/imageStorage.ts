import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'])

export function saveImageFromPath(userDataRoot: string, sourcePath: string): string {
  if (!existsSync(sourcePath)) {
    throw new Error('Image file was not found')
  }

  const ext = extname(sourcePath).toLowerCase()
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error('Unsupported image type')
  }

  const imagesDir = join(userDataRoot, 'images')
  mkdirSync(imagesDir, { recursive: true })

  const relative = `images/${randomUUID()}${ext}`
  copyFileSync(sourcePath, join(userDataRoot, relative))
  return relative
}

export function deleteIfUnreferenced(
  userDataRoot: string,
  relativePath: string,
  referenced: Set<string>
): void {
  if (!relativePath.startsWith('images/') || referenced.has(relativePath)) {
    return
  }
  const absolute = join(userDataRoot, relativePath)
  if (existsSync(absolute)) {
    unlinkSync(absolute)
  }
}
