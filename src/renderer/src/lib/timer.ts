/**
 * Countdown + stopwatch for the Home clock widget.
 * The state lives here (not in a component) so a running timer keeps going when you
 * leave the Home page, and a finished countdown can still beep and notify anywhere.
 */
export type CountdownStatus = 'idle' | 'running' | 'paused' | 'finished'
export type StopwatchStatus = 'idle' | 'running' | 'paused'

export type Countdown = {
  totalMs: number
  status: CountdownStatus
  /** Wall-clock time the countdown ends at (while running). */
  endAt: number | null
  /** Time left while not running. */
  remainingMs: number
}

export type Stopwatch = {
  status: StopwatchStatus
  /** When the current run started (while running). */
  startedAt: number | null
  /** Time banked from earlier runs (before the last pause). */
  elapsedMs: number
}

/** `now` is refreshed about 20 times a second while something is running. */
export type TimerState = { countdown: Countdown; stopwatch: Stopwatch; now: number }

export const DEFAULT_COUNTDOWN_MS = 5 * 60_000
export const MAX_COUNTDOWN_MINUTES = 999

function initialState(): TimerState {
  return {
    countdown: {
      totalMs: DEFAULT_COUNTDOWN_MS,
      status: 'idle',
      endAt: null,
      remainingMs: DEFAULT_COUNTDOWN_MS
    },
    stopwatch: { status: 'idle', startedAt: null, elapsedMs: 0 },
    now: Date.now()
  }
}

const TICK_MS = 50

let state: TimerState = initialState()
let finishTimer: ReturnType<typeof setTimeout> | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null
const listeners = new Set<() => void>()

/** Ticks only while a timer is running, so an idle app does no work. */
function syncTicker(): void {
  const running = state.countdown.status === 'running' || state.stopwatch.status === 'running'
  if (running && tickTimer === null) {
    tickTimer = setInterval(() => update({}), TICK_MS)
  } else if (!running && tickTimer !== null) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

function update(next: Partial<TimerState>): void {
  state = { ...state, ...next, now: Date.now() }
  syncTicker()
  listeners.forEach((listener) => listener())
}

export function getTimerState(): TimerState {
  return state
}

export function subscribeTimers(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** "MM:SS" – minutes keep counting past 59 (e.g. 125:07). */
export function formatMinSec(ms: number, rounding: 'floor' | 'ceil'): string {
  const totalSeconds = Math.max(
    0,
    rounding === 'ceil' ? Math.ceil(ms / 1000) : Math.floor(ms / 1000)
  )
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// --- finish alert: beep + system notification -------------------------------------------

function playBeep(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) {
      return
    }
    const context = new Ctor()
    ;[0, 0.3, 0.6].forEach((offset) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.2, context.currentTime + offset)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + 0.22)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(context.currentTime + offset)
      oscillator.stop(context.currentTime + offset + 0.25)
    })
    window.setTimeout(() => void context.close(), 1500)
  } catch {
    // Sound is a nice-to-have; the on-screen "Time's up" always shows.
  }
}

function showNotification(totalMs: number): void {
  try {
    if (typeof Notification === 'undefined') {
      return
    }
    const show = (): void => {
      new Notification('Timer finished', {
        body: `Your ${formatMinSec(totalMs, 'ceil')} countdown is done.`
      })
    }
    if (Notification.permission === 'granted') {
      show()
    } else if (Notification.permission !== 'denied') {
      void Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          show()
        }
      })
    }
  } catch {
    // Notifications can be blocked by the OS; ignore.
  }
}

// --- countdown --------------------------------------------------------------------------

export function countdownRemaining(countdown: Countdown, now: number): number {
  return countdown.status === 'running' && countdown.endAt !== null
    ? Math.max(0, countdown.endAt - now)
    : countdown.remainingMs
}

function clearFinishTimer(): void {
  if (finishTimer !== null) {
    clearTimeout(finishTimer)
    finishTimer = null
  }
}

function finishCountdown(): void {
  clearFinishTimer()
  if (state.countdown.status !== 'running') {
    return
  }
  update({ countdown: { ...state.countdown, status: 'finished', endAt: null, remainingMs: 0 } })
  playBeep()
  showNotification(state.countdown.totalMs)
}

/** Chooses the countdown length. Ignored while it is running or paused. */
export function setCountdownMinutes(minutes: number): void {
  const { status } = state.countdown
  if (status === 'running' || status === 'paused') {
    return
  }
  const clamped = Math.min(MAX_COUNTDOWN_MINUTES, Math.max(1, Math.round(minutes) || 1))
  const totalMs = clamped * 60_000
  update({ countdown: { totalMs, status: 'idle', endAt: null, remainingMs: totalMs } })
}

export function startCountdown(): void {
  const { countdown } = state
  if (countdown.status === 'running') {
    return
  }
  const remaining = countdown.status === 'paused' ? countdown.remainingMs : countdown.totalMs
  if (remaining <= 0) {
    return
  }
  const endAt = Date.now() + remaining
  clearFinishTimer()
  finishTimer = setTimeout(finishCountdown, remaining)
  update({ countdown: { ...countdown, status: 'running', endAt, remainingMs: remaining } })
}

export function pauseCountdown(): void {
  const { countdown } = state
  if (countdown.status !== 'running') {
    return
  }
  clearFinishTimer()
  update({
    countdown: {
      ...countdown,
      status: 'paused',
      endAt: null,
      remainingMs: countdownRemaining(countdown, Date.now())
    }
  })
}

export function resetCountdown(): void {
  clearFinishTimer()
  const { totalMs } = state.countdown
  update({ countdown: { totalMs, status: 'idle', endAt: null, remainingMs: totalMs } })
}

// --- stopwatch --------------------------------------------------------------------------

export function stopwatchElapsed(stopwatch: Stopwatch, now: number): number {
  return stopwatch.status === 'running' && stopwatch.startedAt !== null
    ? stopwatch.elapsedMs + Math.max(0, now - stopwatch.startedAt)
    : stopwatch.elapsedMs
}

export function startStopwatch(): void {
  if (state.stopwatch.status === 'running') {
    return
  }
  update({ stopwatch: { ...state.stopwatch, status: 'running', startedAt: Date.now() } })
}

export function pauseStopwatch(): void {
  const { stopwatch } = state
  if (stopwatch.status !== 'running') {
    return
  }
  update({
    stopwatch: {
      status: 'paused',
      startedAt: null,
      elapsedMs: stopwatchElapsed(stopwatch, Date.now())
    }
  })
}

export function resetStopwatch(): void {
  update({ stopwatch: { status: 'idle', startedAt: null, elapsedMs: 0 } })
}

/** Test helper: back to a clean slate. */
export function resetAllTimers(): void {
  clearFinishTimer()
  update(initialState())
  syncTicker()
}
