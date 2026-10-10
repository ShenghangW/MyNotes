import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function load(): Promise<typeof import('./appearance')> {
  vi.resetModules()
  return import('./appearance')
}

function mockSystemDark(dark: boolean): void {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: dark,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })) as unknown as typeof window.matchMedia
}

describe('appearance', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.appearance
    delete document.documentElement.dataset.theme
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to the Notion theme in light mode', async () => {
    const { getAppearance, initAppearance } = await load()
    initAppearance()

    expect(getAppearance()).toEqual({ theme: 'notion', mode: 'light' })
    expect(document.documentElement.dataset.appearance).toBe('notion')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('switching to dark updates <html> and is remembered', async () => {
    const first = await load()
    first.setAppearance({ mode: 'dark' })
    expect(document.documentElement.dataset.theme).toBe('dark')

    const second = await load()
    expect(second.getAppearance().mode).toBe('dark')
  })

  it('system mode follows the operating system preference', async () => {
    mockSystemDark(true)
    const { setAppearance, getResolvedMode } = await load()
    setAppearance({ mode: 'system' })
    expect(getResolvedMode()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    mockSystemDark(false)
    setAppearance({ mode: 'system' })
    expect(getResolvedMode()).toBe('light')
  })

  it('ignores unknown stored values', async () => {
    window.localStorage.setItem(
      'mynote.appearance',
      JSON.stringify({ theme: 'nope', mode: 'purple' })
    )
    const { getAppearance } = await load()
    expect(getAppearance()).toEqual({ theme: 'notion', mode: 'light' })
  })

  it('switches to the Apple Glass theme and remembers it', async () => {
    const first = await load()
    first.setAppearance({ theme: 'glass', mode: 'dark' })
    expect(document.documentElement.dataset.appearance).toBe('glass')
    expect(document.documentElement.dataset.theme).toBe('dark')

    const second = await load()
    expect(second.getAppearance()).toEqual({ theme: 'glass', mode: 'dark' })
  })

  it('notifies subscribers when the appearance changes', async () => {
    const { setAppearance, subscribeAppearance } = await load()
    const listener = vi.fn()
    const unsubscribe = subscribeAppearance(listener)

    setAppearance({ mode: 'dark' })
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    setAppearance({ mode: 'light' })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
