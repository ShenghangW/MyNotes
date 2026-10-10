import { useTimers } from '@renderer/hooks/useTimers'
import {
  MAX_COUNTDOWN_MINUTES,
  countdownRemaining,
  formatMinSec,
  pauseCountdown,
  resetCountdown,
  setCountdownMinutes,
  startCountdown
} from '@renderer/lib/timer'
import { cn } from '@renderer/lib/cn'
import TimerRing from './TimerRing'
import { PRIMARY, SECONDARY } from './StopwatchPanel'

const PRESETS = [5, 10, 25]

export default function CountdownPanel(): React.JSX.Element {
  const { timers, now } = useTimers()
  const { countdown } = timers
  const remaining = countdownRemaining(countdown, now)
  const fraction = countdown.totalMs > 0 ? remaining / countdown.totalMs : 0
  const editable = countdown.status === 'idle' || countdown.status === 'finished'
  const minutes = Math.round(countdown.totalMs / 60_000)

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-4">
      {/* The ring empties and thins out as the countdown runs down. */}
      <TimerRing thinning={1 - fraction} arc={fraction}>
        <span
          className="text-4xl font-light tracking-tight text-text tabular-nums"
          data-testid="countdown-time"
        >
          {formatMinSec(remaining, 'ceil')}
        </span>
        {countdown.status === 'finished' ? (
          <span className="text-xs text-accent" role="status">
            Time&apos;s up
          </span>
        ) : null}
      </TimerRing>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={!editable}
            aria-pressed={editable && minutes === preset}
            className={cn(
              'h-7 rounded-sm border px-2 text-xs disabled:opacity-50',
              editable && minutes === preset
                ? 'border-accent bg-hover text-text'
                : 'border-border text-text-muted hover:bg-hover hover:text-text'
            )}
            onClick={() => setCountdownMinutes(preset)}
          >
            {preset} min
          </button>
        ))}
        <label className="flex items-center gap-1 text-xs text-text-muted">
          <input
            type="number"
            aria-label="Countdown minutes"
            min={1}
            max={MAX_COUNTDOWN_MINUTES}
            disabled={!editable}
            value={minutes}
            className="h-7 w-16 rounded-sm border border-border bg-bg px-2 text-sm text-text outline-none focus:border-accent disabled:opacity-50"
            onChange={(event) => setCountdownMinutes(Number(event.target.value))}
          />
          min
        </label>
      </div>

      <div className="flex gap-2">
        {countdown.status === 'running' ? (
          <button type="button" className={SECONDARY} onClick={pauseCountdown}>
            Pause
          </button>
        ) : (
          <button type="button" className={PRIMARY} onClick={startCountdown}>
            {countdown.status === 'paused'
              ? 'Resume'
              : countdown.status === 'finished'
                ? 'Restart'
                : 'Start'}
          </button>
        )}
        <button
          type="button"
          className={SECONDARY}
          disabled={countdown.status === 'idle'}
          onClick={resetCountdown}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
