import { BlockNoteEditor, BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { describe, expect, it } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { table, codeBlock, video, audio, file, ...allowedBlocks } = defaultBlockSpecs
const schema = BlockNoteSchema.create({ blockSpecs: allowedBlocks })

describe('note export HTML', () => {
  it('includes the contents of toggle blocks, as if they were unfolded', () => {
    const editor = BlockNoteEditor.create({ schema })
    const html = editor.blocksToHTMLLossy([
      {
        type: 'toggleListItem',
        content: 'Folded list',
        children: [{ type: 'paragraph', content: 'Hidden child text' }]
      },
      {
        type: 'heading',
        props: { level: 2, isToggleable: true },
        content: 'Folded heading',
        children: [{ type: 'paragraph', content: 'Hidden under heading' }]
      }
    ])

    expect(html).toContain('Folded list')
    expect(html).toContain('Hidden child text')
    expect(html).toContain('Folded heading')
    expect(html).toContain('Hidden under heading')
    expect(html).not.toContain('data-show-children="false"')
  })

  it('exports images with their URL', () => {
    const editor = BlockNoteEditor.create({ schema })
    const html = editor.blocksToHTMLLossy([
      { type: 'image', props: { url: 'app-image://local/images/a.png', name: 'Drawing' } }
    ])
    expect(html).toContain('app-image://local/images/a.png')
  })
})
