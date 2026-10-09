import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockApi } from '../../../test/mockApi'
import { registerSaver } from '../lib/pendingSaves'
import SaveIndicator, { SAVED_FLASH_MS } from './SaveIndicator'

describe('SaveIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows nothing when everything is saved', () => {
    render(<SaveIndicator />)
    expect(screen.queryByTestId('save-pill')).toBeNull()
  })

  it('shows "Unsaved changes…" while a saver is pending', () => {
    render(<SaveIndicator />)
    const saver = registerSaver(async () => undefined)

    act(() => saver.setPending(true))
    expect(screen.getByTestId('save-pill').textContent).toBe('Unsaved changes…')

    act(() => saver.setPending(false))
    expect(screen.queryByTestId('save-pill')).toBeNull()
    saver.unregister()
  })

  it('Ctrl+S flushes pending edits, saves, then shows "Saved" briefly', async () => {
    const manualSave = vi.fn(async () => ({ ok: true as const, data: null }))
    window.api = createMockApi({ app: { ...createMockApi().app, manualSave } })
    const flush = vi.fn(async () => undefined)
    const saver = registerSaver(flush)
    render(<SaveIndicator />)

    await act(async () => {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    })

    expect(flush).toHaveBeenCalledTimes(1)
    expect(manualSave).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('save-pill').textContent).toBe('Saved')

    act(() => {
      vi.advanceTimersByTime(SAVED_FLASH_MS + 10)
    })
    expect(screen.queryByTestId('save-pill')).toBeNull()
    saver.unregister()
  })

  it('shows "Save failed" when the save is rejected', async () => {
    window.api = createMockApi({
      app: {
        ...createMockApi().app,
        manualSave: async () => ({ ok: false as const, error: 'disk full' })
      }
    })
    render(<SaveIndicator />)

    await act(async () => {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    })

    expect(screen.getByTestId('save-pill').textContent).toBe('Save failed')
  })

  it('flushes unsaved edits when the window is about to close', async () => {
    let closeListener: (() => Promise<void>) | null = null
    window.api = createMockApi({
      app: {
        ...createMockApi().app,
        onBeforeClose: (listener) => {
          closeListener = listener
          return () => undefined
        }
      }
    })
    const flush = vi.fn(async () => undefined)
    const saver = registerSaver(flush)
    render(<SaveIndicator />)

    expect(closeListener).not.toBeNull()
    await act(async () => {
      await closeListener!()
    })

    expect(flush).toHaveBeenCalledTimes(1)
    saver.unregister()
  })
})
