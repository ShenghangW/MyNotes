import { describe, expect, it } from 'vitest'
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { BLOCK_KINDS } from './blockKinds'

describe('block menu kinds', () => {
  it('offers headings, toggle headings, toggle/numbered/bulleted/to-do lists and quote', () => {
    const labels = BLOCK_KINDS.map((kind) => kind.label)
    expect(labels).toEqual(
      expect.arrayContaining([
        'Text',
        'Heading 1',
        'Heading 2',
        'Heading 3',
        'Toggle heading 1',
        'Toggle list',
        'Bulleted list',
        'Numbered list',
        'To-do list',
        'Quote'
      ])
    )
  })

  it('every kind exists in the editor schema used by notes', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { table, codeBlock, video, audio, file, ...allowed } = defaultBlockSpecs
    const schema = BlockNoteSchema.create({ blockSpecs: allowed })
    for (const kind of BLOCK_KINDS) {
      expect(kind.type in schema.blockSpecs, kind.label).toBe(true)
    }
  })
})
