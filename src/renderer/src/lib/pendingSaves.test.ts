import { describe, expect, it, vi } from 'vitest'
import {
  flushAllSaves,
  hasPendingSaves,
  registerSaver,
  subscribePendingSaves
} from './pendingSaves'

describe('pendingSaves', () => {
  it('flushAllSaves flushes every registered saver', async () => {
    const a = vi.fn(async () => undefined)
    const b = vi.fn(async () => undefined)
    const first = registerSaver(a)
    const second = registerSaver(b)

    await flushAllSaves()

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    first.unregister()
    second.unregister()
  })

  it('reports pending only while a saver has unsaved edits, and notifies listeners', () => {
    const listener = vi.fn()
    const unsubscribe = subscribePendingSaves(listener)
    const saver = registerSaver(async () => undefined)
    expect(hasPendingSaves()).toBe(false)

    saver.setPending(true)
    expect(hasPendingSaves()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)

    saver.setPending(false)
    expect(hasPendingSaves()).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)

    saver.unregister()
    unsubscribe()
  })

  it('an unregistered saver is no longer flushed or pending', async () => {
    const flush = vi.fn(async () => undefined)
    const saver = registerSaver(flush)
    saver.setPending(true)
    saver.unregister()

    await flushAllSaves()

    expect(flush).not.toHaveBeenCalled()
    expect(hasPendingSaves()).toBe(false)
  })
})
