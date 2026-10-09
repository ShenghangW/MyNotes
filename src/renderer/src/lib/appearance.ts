/**
 * Appearance = which visual theme (colours, radii, fonts) and which colour mode.
 * Purely visual: it is stored in this window's localStorage and applied as
 * data attributes on <html>, so it never touches notes, events or any other data.
 * New themes only need an entry in THEMES plus a CSS block in app.css.
 */
export type ThemeId = 'notion'
export type ColorMode = 'light' | 'dark' | 'system'
export type ResolvedMode = 'light' | 'dark'
export type Appearance = { theme: ThemeId; mode: ColorMode }

export const THEMES: { id: ThemeId; label: string; description: string }[] = [
  { id: 'notion', label: 'Notion', description: 'Flat, quiet and compact, like Notion' }
]

export const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' }
]

export const APPEARANCE_STORAGE_KEY = 'mynote.appearance'
export const DEFAULT_APPEARANCE: Appearance = { theme: 'notion', mode: 'light' }

const DARK_QUERY = '(prefers-color-scheme: dark)'
const listeners = new Set<() => void>()
let current: Appearance | null = null
let watchingSystem = false

function parse(raw: string | null): Appearance {
  if (!raw) {
    return DEFAULT_APPEARANCE
  }
  try {
    const value = JSON.parse(raw) as Partial<Appearance>
    const theme = THEMES.find((item) => item.id === value.theme)?.id ?? DEFAULT_APPEARANCE.theme
    const mode = COLOR_MODES.find((item) => item.id === value.mode)?.id ?? DEFAULT_APPEARANCE.mode
    return { theme, mode }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export function getAppearance(): Appearance {
  if (current === null) {
    let raw: string | null = null
    try {
      raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
    } catch {
      raw = null
    }
    current = parse(raw)
  }
  return current
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function resolveMode(mode: ColorMode): ResolvedMode {
  if (mode === 'system') {
    return systemPrefersDark() ? 'dark' : 'light'
  }
  return mode
}

export function getResolvedMode(): ResolvedMode {
  return resolveMode(getAppearance().mode)
}

/** Writes the theme + mode onto <html> so the CSS tokens in app.css take effect. */
export function applyAppearance(): void {
  const root = document.documentElement
  root.dataset.appearance = getAppearance().theme
  root.dataset.theme = getResolvedMode()
}

function emit(): void {
  applyAppearance()
  listeners.forEach((listener) => listener())
}

export function setAppearance(patch: Partial<Appearance>): void {
  current = parse(JSON.stringify({ ...getAppearance(), ...patch }))
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Storage can be unavailable; the choice still applies until the window closes.
  }
  emit()
}

export function subscribeAppearance(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Call once at startup, before the first render, so the page never flashes the wrong colours. */
export function initAppearance(): void {
  applyAppearance()
  if (!watchingSystem && typeof window.matchMedia === 'function') {
    watchingSystem = true
    window.matchMedia(DARK_QUERY).addEventListener('change', () => {
      if (getAppearance().mode === 'system') {
        emit()
      }
    })
  }
}
