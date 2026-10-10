import { useSyncExternalStore } from 'react'
import { getTimerState, subscribeTimers, type TimerState } from '@renderer/lib/timer'

/** Timer state plus `now`, which the timer store keeps fresh while something is running. */
export function useTimers(): { timers: TimerState; now: number } {
  const timers = useSyncExternalStore(subscribeTimers, getTimerState)
  return { timers, now: timers.now }
}
