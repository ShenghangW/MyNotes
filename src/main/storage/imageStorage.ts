import { copyFileSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
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

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const MAX_DRAWING_BYTES = 20 * 1024 * 1024

/** Saves a PNG (e.g. a drawing made in the note editor) and returns its relative path. */
export function saveImageFromBytes(userDataRoot: string, bytes: Uint8Array): string {
  if (!ArrayBuffer.isView(bytes) || bytes.length <= PNG_SIGNATURE.length) {
    throw new Error('The drawing is empty')
  }
  if (bytes.length > MAX_DRAWING_BYTES) {
    throw new Error('The drawing is too large')
  }
  if (!PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    throw new Error('Only PNG drawings can be saved')
  }

  const imagesDir = join(userDataRoot, 'images')
  mkdirSync(imagesDir, { recursive: true })

  const relative = `images/${randomUUID()}.png`
  writeFileSync(join(userDataRoot, relative), bytes)
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
