// @vitest-environment node
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { deleteIfUnreferenced, saveImageFromPath } from './imageStorage'

describe('imageStorage', () => {
  it('copies an image into userdata/images and returns a relative path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mynote-img-'))
    const source = join(dir, 'photo.png')
    writeFileSync(source, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))

    const relative = saveImageFromPath(dir, source)
    expect(relative.startsWith('images/')).toBe(true)
    expect(relative.endsWith('.png')).toBe(true)
    expect(existsSync(join(dir, relative))).toBe(true)
  })

  it('deletes an image that is not referenced', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mynote-img-'))
    const source = join(dir, 'photo.png')
    writeFileSync(source, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    const relative = saveImageFromPath(dir, source)

    deleteIfUnreferenced(dir, relative, new Set())
    expect(existsSync(join(dir, relative))).toBe(false)
  })
})
