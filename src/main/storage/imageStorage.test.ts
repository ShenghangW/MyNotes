// @vitest-environment node
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { deleteIfUnreferenced, saveImageFromBytes, saveImageFromPath } from './imageStorage'

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

  it('saves PNG bytes (a drawing) into userdata/images', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mynote-img-'))
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

    const relative = saveImageFromBytes(dir, png)

    expect(relative).toMatch(/^images\/[0-9a-f-]+\.png$/)
    expect(readFileSync(join(dir, relative))).toEqual(Buffer.from(png))
  })

  it('rejects empty, oversized and non-PNG drawing bytes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mynote-img-'))

    expect(() => saveImageFromBytes(dir, new Uint8Array(0))).toThrow('empty')
    expect(() => saveImageFromBytes(dir, new Uint8Array(32))).toThrow('PNG')
    const huge = new Uint8Array(20 * 1024 * 1024 + 1)
    expect(() => saveImageFromBytes(dir, huge)).toThrow('too large')
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
