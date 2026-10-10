import { existsSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml'
}

const LOCAL_IMAGE_RE = /app-image:\/\/local\/(images\/[A-Za-z0-9._-]+)/g

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** A safe default file name for the save dialog. */
export function safeFileName(title: string): string {
  const cleaned = title
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .trim()
  return cleaned === '' ? 'Untitled' : cleaned
}

/** The print window can't load our custom image protocol, so embed the image files directly. */
export function inlineLocalImages(html: string, userDataRoot: string): string {
  return html.replace(LOCAL_IMAGE_RE, (match, relative: string) => {
    const absolute = join(userDataRoot, relative)
    const mime = MIME_BY_EXT[extname(relative).toLowerCase()]
    if (!mime || !existsSync(absolute)) {
      return match
    }
    return `data:${mime};base64,${readFileSync(absolute).toString('base64')}`
  })
}

const PRINT_CSS = `
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  html { color-scheme: light; }
  body {
    margin: 0;
    background: #ffffff;
    color: #37352f;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
  }
  h1.note-title { font-size: 26pt; line-height: 1.2; margin: 0 0 14pt; }
  h1, h2, h3 { line-height: 1.3; break-after: avoid; }
  h1 { font-size: 20pt; margin: 16pt 0 6pt; }
  h2 { font-size: 16pt; margin: 14pt 0 5pt; }
  h3 { font-size: 13pt; margin: 12pt 0 4pt; }
  p { margin: 0 0 6pt; }
  ul, ol { margin: 0 0 6pt; padding-left: 20pt; }
  li { margin: 2pt 0; }
  li > p { margin: 0; }
  img { max-width: 100%; height: auto; break-inside: avoid; }
  figure { margin: 8pt 0; break-inside: avoid; }
  figcaption { color: #6f6e69; font-size: 9pt; margin-top: 3pt; }
  blockquote { margin: 6pt 0; padding-left: 10pt; border-left: 3pt solid #d9d8d4; color: #4b4a45; }
  pre, code { font-family: Consolas, 'Courier New', monospace; font-size: 10pt; }
  hr { border: 0; border-top: 1px solid #e9e9e7; margin: 10pt 0; }
  a { color: #2383e2; }
  input[type='checkbox'] { margin-right: 6pt; }
`

/**
 * Wraps the editor's HTML into a standalone, light-themed print page. The editor exports
 * toggle blocks fully expanded, so folded content is printed like any other text.
 */
export function buildPrintHtml(input: {
  title: string
  bodyHtml: string
  userDataRoot: string
}): string {
  const title = input.title.trim() === '' ? 'Untitled' : input.title.trim()
  const body = inlineLocalImages(input.bodyHtml, input.userDataRoot)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
<title>${escapeHtml(title)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
<h1 class="note-title">${escapeHtml(title)}</h1>
${body}
</body>
</html>`
}
