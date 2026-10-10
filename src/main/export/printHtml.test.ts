// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPrintHtml, escapeHtml, inlineLocalImages, safeFileName } from './printHtml'

function makeUserData(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mynote-print-'))
  mkdirSync(join(dir, 'images'))
  writeFileSync(join(dir, 'images', 'a.png'), Buffer.from([1, 2, 3]))
  return dir
}

describe('printHtml', () => {
  it('escapes HTML in the title', () => {
    expect(escapeHtml('<b>"A" & B</b>')).toBe('&lt;b&gt;&quot;A&quot; &amp; B&lt;/b&gt;')
    const html = buildPrintHtml({
      title: '<script>x</script>',
      bodyHtml: '<p>hi</p>',
      userDataRoot: ''
    })
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;')
  })

  it('puts the title and body in a light, print-ready page', () => {
    const html = buildPrintHtml({ title: 'Maths', bodyHtml: '<p>Hello</p>', userDataRoot: '' })
    expect(html).toContain('<h1 class="note-title">Maths</h1>')
    expect(html).toContain('<p>Hello</p>')
    expect(html).toContain('@page { size: A4')
    expect(html).toContain("default-src 'none'")
  })

  it('uses "Untitled" when the title is blank', () => {
    const html = buildPrintHtml({ title: '   ', bodyHtml: '', userDataRoot: '' })
    expect(html).toContain('<h1 class="note-title">Untitled</h1>')
  })

  it('embeds local images as data URIs and leaves missing ones alone', () => {
    const dir = makeUserData()
    const html = inlineLocalImages(
      '<img src="app-image://local/images/a.png"><img src="app-image://local/images/missing.png">',
      dir
    )
    expect(html).toContain('src="data:image/png;base64,AQID"')
    expect(html).toContain('app-image://local/images/missing.png')
  })

  it('makes a safe file name', () => {
    expect(safeFileName('Week 1: Java / Basics?')).toBe('Week 1 Java Basics')
    expect(safeFileName('   ')).toBe('Untitled')
    expect(safeFileName('a'.repeat(200)).length).toBe(80)
  })
})
