// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveImagePath } from './imageProtocol'

describe('resolveImagePath', () => {
  const root = mkdtempSync(join(tmpdir(), 'mynote-proto-'))
  mkdirSync(join(root, 'images'))
  writeFileSync(join(root, 'images', 'a.png'), 'x')
  writeFileSync(join(root, 'secret.txt'), 'x')

  it('maps an app-image URL to the file inside userData/images', () => {
    expect(resolveImagePath(root, 'app-image://local/images/a.png')).toBe(
      join(root, 'images', 'a.png')
    )
  })

  it('returns null for missing files, other schemes, and non-image folders', () => {
    expect(resolveImagePath(root, 'app-image://local/images/missing.png')).toBeNull()
    expect(resolveImagePath(root, 'file:///etc/passwd')).toBeNull()
    expect(resolveImagePath(root, 'app-image://local/secret.txt')).toBeNull()
    expect(resolveImagePath(root, 'not a url')).toBeNull()
  })

  it('blocks path traversal, including encoded forms', () => {
    expect(resolveImagePath(root, 'app-image://local/images/../secret.txt')).toBeNull()
    expect(resolveImagePath(root, 'app-image://local/images/%2e%2e/secret.txt')).toBeNull()
    expect(resolveImagePath(root, 'app-image://local/images/..%2fsecret.txt')).toBeNull()
  })
})
