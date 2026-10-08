/** Custom protocol the main process serves from userData/images (see main/storage/imageProtocol.ts). */
export const APP_IMAGE_SCHEME = 'app-image'
const HOST = 'local'

/** `images/{uuid}.png` -> `app-image://local/images/{uuid}.png` */
export function toAppImageUrl(relativePath: string): string {
  return `${APP_IMAGE_SCHEME}://${HOST}/${relativePath.replace(/^\/+/, '')}`
}

/** Inverse of `toAppImageUrl`. Returns null for anything that is not one of our URLs. */
export function fromAppImageUrl(url: string): string | null {
  const prefix = `${APP_IMAGE_SCHEME}://${HOST}/`
  if (!url.startsWith(prefix)) {
    return null
  }
  const relative = url.slice(prefix.length)
  return relative.startsWith('images/') ? relative : null
}

const INLINE_IMAGE_RE = /app-image:\/\/local\/(images\/[A-Za-z0-9._-]+)/g

/** Relative image paths embedded in a note's BlockNote JSON. */
export function extractInlineImagePaths(contentJson: string): string[] {
  const found = new Set<string>()
  for (const match of contentJson.matchAll(INLINE_IMAGE_RE)) {
    found.add(match[1])
  }
  return [...found]
}
