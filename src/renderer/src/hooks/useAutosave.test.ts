import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushAllSaves, hasPendingSaves } from '../lib/pendingSaves'
import { useAutosave } from './useAutosave'

type Patch = { title: string; contentJson: string }

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('coalesces rapid edits into a single save after the delay', async () => {
    const save = vi.fn<(patch: Patch) => Promise<void>>().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutosave<Patch>(save, { delayMs: 700 }))

    act(() => {
      result.current.schedule({ contentJson: 'a' })
      vi.advanceTimersByTime(300)
      result.current.schedule({ contentJson: 'ab' })
      vi.advanceTimersByTime(300)
      result.current.schedule({ title: 'T', contentJson: 'abc' })
    })
    expect(save).not.toHaveBeenCalled()
    expect(result.current.status).toBe('pending')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ title: 'T', contentJson: 'abc' })
    expect(result.current.status).toBe('saved')
  })

  it('flush saves immediately (Ctrl+S) and the timer does not save again', async () => {
    const save = vi.fn<(patch: Patch) => Promise<void>>().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutosave<Patch>(save))

    act(() => result.current.schedule({ title: 'Now' }))
    await act(async () => {
      await result.current.flush()
    })
    expect(save).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('is reachable through the app-wide registry (Ctrl+S / window close)', async () => {
    const save = vi.fn<(patch: Patch) => Promise<void>>().mockResolvedValue(undefined)
    const { result, unmount } = renderHook(() => useAutosave<Patch>(save))

    act(() => result.current.schedule({ title: 'Typed' }))
    expect(hasPendingSaves()).toBe(true)

    await act(async () => {
      await flushAllSaves()
    })
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ title: 'Typed' })
    expect(hasPendingSaves()).toBe(false)

    unmount()
  })

  it('flush with nothing pending does not call save', async () => {
    const save = vi.fn<(patch: Patch) => Promise<void>>().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutosave<Patch>(save))
    await act(async () => {
      await result.current.flush()
    })
    expect(save).not.toHaveBeenCalled()
  })

  it('saves pending edits on unmount', async () => {
    const save = vi.fn<(patch: Patch) => Promise<void>>().mockResolvedValue(undefined)
    const { result, unmount } = renderHook(() => useAutosave<Patch>(save))

    act(() => result.current.schedule({ contentJson: 'last words' }))
    unmount()
    await vi.advanceTimersByTimeAsync(0)

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ contentJson: 'last words' })
  })

  it('never runs two saves at once and surfaces failures', async () => {
    let release: () => void = () => undefined
    const save = vi
      .fn<(patch: Patch) => Promise<void>>()
      .mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)))
      .mockRejectedValueOnce(new Error('disk full'))
    const { result } = renderHook(() => useAutosave<Patch>(save, { delayMs: 100 }))

    act(() => result.current.schedule({ title: 'one' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(save).toHaveBeenCalledTimes(1)

    act(() => result.current.schedule({ title: 'two' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    // Second save is queued behind the first one.
    expect(save).toHaveBeenCalledTimes(1)

    await act(async () => {
      release()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(save).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('disk full')
  })
})
