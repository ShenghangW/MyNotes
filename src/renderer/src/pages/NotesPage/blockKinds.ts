export type BlockKind = {
  label: string
  type: string
  props?: Record<string, boolean | number | string>
}

/** Everything a line can be turned into from the block menu (drag handle). */
export const BLOCK_KINDS: readonly BlockKind[] = [
  { label: 'Text', type: 'paragraph' },
  { label: 'Heading 1', type: 'heading', props: { level: 1, isToggleable: false } },
  { label: 'Heading 2', type: 'heading', props: { level: 2, isToggleable: false } },
  { label: 'Heading 3', type: 'heading', props: { level: 3, isToggleable: false } },
  { label: 'Toggle heading 1', type: 'heading', props: { level: 1, isToggleable: true } },
  { label: 'Toggle heading 2', type: 'heading', props: { level: 2, isToggleable: true } },
  { label: 'Toggle heading 3', type: 'heading', props: { level: 3, isToggleable: true } },
  { label: 'Toggle list', type: 'toggleListItem' },
  { label: 'Bulleted list', type: 'bulletListItem' },
  { label: 'Numbered list', type: 'numberedListItem' },
  { label: 'To-do list', type: 'checkListItem' },
  { label: 'Quote', type: 'quote' }
]
