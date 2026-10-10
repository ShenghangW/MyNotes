import { useTimers } from '@renderer/hooks/useTimers'
import {
  formatMinSec,
  pauseStopwatch,
  resetStopwatch,
  startStopwatch,
  stopwatchElapsed
} from '@renderer/lib/timer'
import TimerRing from './TimerRing'

const LAP_MS = 60_000

export default function StopwatchPanel(): React.JSX.Element {
  const { timers, now } = useTimers()
  const { stopwatch } = timers
  const elapsed = stopwatchElapsed(stopwatch, now)
  // One lap = one minute: the ring starts full and thick, then thins out until the minute is up.
  const lapProgress = (elapsed % LAP_MS) / LAP_MS

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-4">
      <TimerRing thinning={lapProgress}>
        <span
          className="text-4xl font-light tracking-tight text-text tabular-nums"
          data-testid="stopwatch-time"
        >
          {formatMinSec(elapsed, 'floor')}
        </span>
      </TimerRing>
      <div className="flex gap-2">
        {stopwatch.status === 'running' ? (
          <button type="button" className={SECONDARY} onClick={pauseStopwatch}>
            Pause
          </button>
        ) : (
          <button type="button" className={PRIMARY} onClick={startStopwatch}>
            {stopwatch.status === 'paused' ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          type="button"
          className={SECONDARY}
          disabled={stopwatch.status === 'idle'}
          onClick={resetStopwatch}
        >
          Reset
        </button>
      </div>
    </div>
  )
}

export const PRIMARY =
  'h-8 rounded-sm bg-accent px-4 text-sm text-on-accent hover:opacity-90 disabled:opacity-50'
export const SECONDARY =
  'h-8 rounded-sm border border-border px-4 text-sm text-text hover:bg-hover disabled:opacity-50'
