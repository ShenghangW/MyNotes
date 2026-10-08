type InlineLike = { type?: string; text?: unknown; content?: unknown }
type BlockLike = { content?: unknown; children?: unknown }

function inlineText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (!Array.isArray(content)) {
    return ''
  }
  return (content as InlineLike[])
    .map((item) => {
      if (typeof item?.text === 'string') {
        return item.text
      }
      return item?.content ? inlineText(item.content) : ''
    })
    .join('')
}

function collect(blocks: unknown, out: string[]): void {
  if (!Array.isArray(blocks)) {
    return
  }
  for (const block of blocks as BlockLike[]) {
    const text = inlineText(block?.content).trim()
    if (text) {
      out.push(text)
    }
    collect(block?.children, out)
  }
}

/** Visible text of a BlockNote document, one line per block. Bad JSON yields ''. */
export function extractPlainText(contentJson: string): string {
  try {
    const out: string[] = []
    collect(JSON.parse(contentJson), out)
    return out.join('\n')
  } catch {
    return ''
  }
}

export function makePreview(plainText: string, maxLength = 160): string {
  const collapsed = plainText.replace(/\s+/g, ' ').trim()
  return collapsed.length > maxLength ? `${collapsed.slice(0, maxLength).trimEnd()}…` : collapsed
}
