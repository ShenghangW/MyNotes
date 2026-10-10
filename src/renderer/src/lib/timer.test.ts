import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  countdownRemaining,
  formatMinSec,
  getTimerState,
  pauseCountdown,
  pauseStopwatch,
  resetAllTimers,
  resetCountdown,
  resetStopwatch,
  setCountdownMinutes,
  startCountdown,
  startStopwatch,
  stopwatchElapsed
} from './timer'

describe('timer', () => {
  const notification = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T10:00:00Z'))
    notification.mockClear()
    class FakeNotification {
      static permission = 'granted'
      constructor(title: string, options?: { body?: string }) {
        notification(title, options?.body)
      }
    }
    vi.stubGlobal('Notification', FakeNotification)
    resetAllTimers()
  })

  afterEach(() => {
    resetAllTimers()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('formats minutes and seconds, with minutes past 59', () => {
    expect(formatMinSec(0, 'floor')).toBe('00:00')
    expect(formatMinSec(59_999, 'floor')).toBe('00:59')
    expect(formatMinSec(59_001, 'ceil')).toBe('01:00')
    expect(formatMinSec(125 * 60_000 + 7_000, 'floor')).toBe('125:07')
    expect(formatMinSec(-5, 'ceil')).toBe('00:00')
  })

  it('counts down, and finishes with a notification', () => {
    setCountdownMinutes(2)
    startCountdown()
    expect(getTimerState().countdown.status).toBe('running')

    vi.advanceTimersByTime(60_000)
    expect(countdownRemaining(getTimerState().countdown, Date.now())).toBe(60_000)
    expect(notification).not.toHaveBeenCalled()

    vi.advanceTimersByTime(60_000)
    expect(getTimerState().countdown.status).toBe('finished')
    expect(getTimerState().countdown.remainingMs).toBe(0)
    expect(notification).toHaveBeenCalledTimes(1)
    expect(notification).toHaveBeenCalledWith('Timer finished', 'Your 02:00 countdown is done.')
  })

  it('pauses, resumes with the time that was left, and resets', () => {
    setCountdownMinutes(5)
    startCountdown()
    vi.advanceTimersByTime(90_000)
    pauseCountdown()
    expect(getTimerState().countdown.status).toBe('paused')
    expect(getTimerState().countdown.remainingMs).toBe(210_000)

    vi.advanceTimersByTime(30_000) // paused time doesn't count
    expect(countdownRemaining(getTimerState().countdown, Date.now())).toBe(210_000)

    startCountdown()
    vi.advanceTimersByTime(210_000)
    expect(getTimerState().countdown.status).toBe('finished')

    resetCountdown()
    expect(getTimerState().countdown.status).toBe('idle')
    expect(getTimerState().countdown.remainingMs).toBe(5 * 60_000)
  })

  it('does not notify when paused or reset before the end', () => {
    setCountdownMinutes(1)
    startCountdown()
    vi.advanceTimersByTime(30_000)
    pauseCountdown()
    vi.advanceTimersByTime(120_000)
    expect(notification).not.toHaveBeenCalled()

    resetCountdown()
    vi.advanceTimersByTime(120_000)
    expect(notification).not.toHaveBeenCalled()
  })

  it('only changes the length while it is not running', () => {
    setCountdownMinutes(10)
    startCountdown()
    setCountdownMinutes(30)
    expect(getTimerState().countdown.totalMs).toBe(10 * 60_000)
  })

  it('keeps the length within 1 to 999 minutes', () => {
    setCountdownMinutes(0)
    expect(getTimerState().countdown.totalMs).toBe(60_000)
    setCountdownMinutes(5000)
    expect(getTimerState().countdown.totalMs).toBe(999 * 60_000)
  })

  it('restarts a finished countdown from the full length', () => {
    setCountdownMinutes(1)
    startCountdown()
    vi.advanceTimersByTime(60_000)
    expect(getTimerState().countdown.status).toBe('finished')

    startCountdown()
    expect(getTimerState().countdown.status).toBe('running')
    expect(countdownRemaining(getTimerState().countdown, Date.now())).toBe(60_000)
  })

  it('stopwatch counts up, pauses, resumes and resets', () => {
    startStopwatch()
    vi.advanceTimersByTime(5_000)
    expect(stopwatchElapsed(getTimerState().stopwatch, Date.now())).toBe(5_000)

    pauseStopwatch()
    vi.advanceTimersByTime(10_000)
    expect(stopwatchElapsed(getTimerState().stopwatch, Date.now())).toBe(5_000)

    startStopwatch()
    vi.advanceTimersByTime(2_000)
    expect(stopwatchElapsed(getTimerState().stopwatch, Date.now())).toBe(7_000)

    resetStopwatch()
    expect(getTimerState().stopwatch).toEqual({ status: 'idle', startedAt: null, elapsedMs: 0 })
  })
})
