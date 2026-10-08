import { existsSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { APP_IMAGE_SCHEME } from '../../shared/imageUrl'

/**
 * Maps an `app-image://local/images/{file}` URL to an absolute file inside
 * userData/images. Returns null for anything else (wrong scheme, traversal,
 * missing file) so the protocol handler can answer 404.
 */
export function resolveImagePath(userDataRoot: string, rawUrl: string): string | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.protocol !== `${APP_IMAGE_SCHEME}:`) {
    return null
  }

  let relative: string
  try {
    relative = decodeURIComponent(url.pathname).replace(/^\/+/, '')
  } catch {
    return null
  }
  if (!relative.startsWith('images/')) {
    return null
  }

  const imagesDir = resolve(userDataRoot, 'images')
  const absolute = resolve(userDataRoot, relative)
  if (!absolute.startsWith(imagesDir + sep) || !existsSync(absolute)) {
    return null
  }
  return absolute
}
