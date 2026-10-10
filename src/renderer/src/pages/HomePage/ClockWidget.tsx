import { useEffect, useState } from 'react'
import { UI_LOCALE, formatNumericDate, toLocalTime } from '@renderer/lib/date'
import { useTimers } from '@renderer/hooks/useTimers'
import { cn } from '@renderer/lib/cn'
import { countdownRemaining, formatMinSec, stopwatchElapsed } from '@renderer/lib/timer'
import CountdownPanel from './CountdownPanel'
import StopwatchPanel from './StopwatchPanel'

type View = 'clock' | 'timer' | 'stopwatch'

function Clock(): React.JSX.Element {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const weekday = now.toLocaleDateString(UI_LOCALE, { weekday: 'long' })
  const date = formatNumericDate(now)

  return (
    <>
      <div className="border-b border-border px-4 py-2">
        <p className="text-xs tracking-wide text-text-muted uppercase">{weekday}</p>
        <p className="text-sm text-text">{date}</p>
      </div>
      <p
        className="px-4 py-4 text-5xl font-light tracking-tight text-text tabular-nums"
        data-testid="clock-time"
      >
        {toLocalTime(now)}
      </p>
    </>
  )
}

/** Current time (24-hour) with the date, plus a countdown timer and a stopwatch. */
export default function ClockWidget(): React.JSX.Element {
  const [view, setView] = useState<View>('clock')
  const { timers, now } = useTimers()
  const { countdown, stopwatch } = timers

  // A running (or paused) timer shows its time on its tab, so you can see it from the Clock view.
  const timerBadge =
    countdown.status === 'running' || countdown.status === 'paused'
      ? formatMinSec(countdownRemaining(countdown, now), 'ceil')
      : null
  const stopwatchBadge =
    stopwatch.status !== 'idle' ? formatMinSec(stopwatchElapsed(stopwatch, now), 'floor') : null

  const tabs: { id: View; label: string; badge: string | null }[] = [
    { id: 'clock', label: 'Clock', badge: null },
    { id: 'timer', label: 'Timer', badge: timerBadge },
    { id: 'stopwatch', label: 'Stopwatch', badge: stopwatchBadge }
  ]

  return (
    <section
      aria-label="Clock"
      className="overflow-hidden rounded-md border border-border bg-bg text-center"
    >
      <div role="tablist" aria-label="Clock views" className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            className={cn(
              'flex h-8 flex-1 items-center justify-center gap-1.5 text-xs',
              view === tab.id
                ? 'bg-hover font-medium text-text'
                : 'text-text-muted hover:bg-hover hover:text-text'
            )}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
            {tab.badge ? (
              <span className="text-accent tabular-nums" data-testid={`${tab.id}-badge`}>
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {view === 'clock' ? <Clock /> : view === 'timer' ? <CountdownPanel /> : <StopwatchPanel />}
    </section>
  )
}
