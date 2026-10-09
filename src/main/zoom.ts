/** Window size the UI is designed for; larger windows scale the whole UI up proportionally. */
export const DESIGN_WIDTH = 1400
export const DESIGN_HEIGHT = 800
export const MIN_AUTO_ZOOM = 1
export const MAX_AUTO_ZOOM = 2.5
export const MIN_USER_ZOOM = 0.6
export const MAX_USER_ZOOM = 2
export const USER_ZOOM_STEP = 0.1

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Final page zoom: automatic (grows with the window, never shrinks below 100%)
 * times the user's own Ctrl +/- adjustment.
 */
export function computeZoomFactor(width: number, height: number, userZoom = 1): number {
  const auto = clamp(
    Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT),
    MIN_AUTO_ZOOM,
    MAX_AUTO_ZOOM
  )
  return Math.round(auto * clamp(userZoom, MIN_USER_ZOOM, MAX_USER_ZOOM) * 100) / 100
}

/** Next user zoom for a Ctrl shortcut key, or null if the key isn't a zoom shortcut. */
export function nextUserZoom(current: number, key: string): number | null {
  if (key === '0') {
    return 1
  }
  if (key === '=' || key === '+') {
    return clamp(Math.round((current + USER_ZOOM_STEP) * 100) / 100, MIN_USER_ZOOM, MAX_USER_ZOOM)
  }
  if (key === '-' || key === '_') {
    return clamp(Math.round((current - USER_ZOOM_STEP) * 100) / 100, MIN_USER_ZOOM, MAX_USER_ZOOM)
  }
  return null
}
