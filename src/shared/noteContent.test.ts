import { describe, expect, it } from 'vitest'
import { extractInlineImagePaths, fromAppImageUrl, toAppImageUrl } from './imageUrl'
import { extractPlainText, makePreview } from './noteText'

describe('imageUrl', () => {
  it('round-trips relative paths', () => {
    const url = toAppImageUrl('images/abc.png')
    expect(url).toBe('app-image://local/images/abc.png')
    expect(fromAppImageUrl(url)).toBe('images/abc.png')
    expect(fromAppImageUrl('https://example.com/a.png')).toBeNull()
  })

  it('finds inline image paths inside note JSON', () => {
    const json = JSON.stringify([
      { type: 'image', props: { url: toAppImageUrl('images/a.png') } },
      { type: 'image', props: { url: toAppImageUrl('images/a.png') } },
      { type: 'image', props: { url: toAppImageUrl('images/b.jpg') } }
    ])
    expect(extractInlineImagePaths(json).sort()).toEqual(['images/a.png', 'images/b.jpg'])
  })
})

describe('noteText', () => {
  it('extracts text from nested blocks, links and children', () => {
    const json = JSON.stringify([
      {
        type: 'heading',
        content: [{ type: 'text', text: 'Chapter 1', styles: {} }],
        children: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'see ', styles: {} },
              { type: 'link', href: 'x', content: [{ type: 'text', text: 'this', styles: {} }] }
            ],
            children: []
          }
        ]
      }
    ])
    expect(extractPlainText(json)).toBe('Chapter 1\nsee this')
  })

  it('returns an empty string for invalid JSON and truncates previews', () => {
    expect(extractPlainText('oops')).toBe('')
    expect(makePreview('a  b\n c')).toBe('a b c')
    expect(makePreview('x'.repeat(200), 10)).toBe('xxxxxxxxxx…')
  })
})
