import { type ReactNode } from 'react'
import { SideMenuExtension } from '@blocknote/core/extensions'
import {
  BlockColorsItem,
  DragHandleMenu,
  RemoveBlockItem,
  useBlockNoteEditor,
  useComponentsContext,
  useExtensionState
} from '@blocknote/react'

import { BLOCK_KINDS, type BlockKind } from './blockKinds'

type MenuBlock = { id: string; type: string; props: Record<string, unknown> }

function isCurrent(kind: BlockKind, block: MenuBlock): boolean {
  if (kind.type !== block.type) {
    return false
  }
  if (kind.type !== 'heading') {
    return true
  }
  return (
    block.props.level === kind.props?.level &&
    Boolean(block.props.isToggleable) === Boolean(kind.props?.isToggleable)
  )
}

/** "Turn into ▸" — changes the block's type in place, keeping its text. */
function TurnIntoItem({ children }: { children: ReactNode }): React.JSX.Element | null {
  const Components = useComponentsContext()
  const editor = useBlockNoteEditor()
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block
  }) as MenuBlock | undefined

  if (!Components || !block) {
    return null
  }
  // Only offer kinds this editor actually has (the schema removes some, e.g. code blocks).
  const kinds = BLOCK_KINDS.filter((kind) => kind.type in editor.schema.blockSpecs)

  return (
    <Components.Generic.Menu.Root position="right" sub>
      <Components.Generic.Menu.Trigger sub>
        <Components.Generic.Menu.Item className="bn-menu-item" subTrigger>
          {children}
        </Components.Generic.Menu.Item>
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown sub className="bn-menu-dropdown">
        {kinds.map((kind) => (
          <Components.Generic.Menu.Item
            key={kind.label}
            className="bn-menu-item"
            checked={isCurrent(kind, block)}
            onClick={() =>
              editor.updateBlock(block.id, { type: kind.type, props: kind.props ?? {} } as never)
            }
          >
            {kind.label}
          </Components.Generic.Menu.Item>
        ))}
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  )
}

type PlainBlock = { id?: string; children?: PlainBlock[] } & Record<string, unknown>

/** A copy of the block (and its nested blocks) without ids, so it can be inserted as new. */
function withoutIds(block: PlainBlock): PlainBlock {
  const { id: _id, children, ...rest } = block
  void _id
  return { ...rest, children: (children ?? []).map(withoutIds) }
}

function DuplicateItem({ children }: { children: ReactNode }): React.JSX.Element | null {
  const Components = useComponentsContext()
  const editor = useBlockNoteEditor()
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block
  })

  if (!Components || !block) {
    return null
  }
  return (
    <Components.Generic.Menu.Item
      className="bn-menu-item"
      onClick={() =>
        editor.insertBlocks([withoutIds(block as PlainBlock)] as never, block, 'after')
      }
    >
      {children}
    </Components.Generic.Menu.Item>
  )
}

/** The menu behind the ⋮⋮ handle: turn into, colours, duplicate, delete. */
export function NoteDragHandleMenu(): React.JSX.Element {
  return (
    <DragHandleMenu>
      <TurnIntoItem>Turn into</TurnIntoItem>
      <BlockColorsItem>Colours</BlockColorsItem>
      <DuplicateItem>Duplicate</DuplicateItem>
      <RemoveBlockItem>Delete</RemoveBlockItem>
    </DragHandleMenu>
  )
}
