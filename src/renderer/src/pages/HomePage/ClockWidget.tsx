import { useEffect, useState } from 'react'
import { UI_LOCALE, formatNumericDate, toLocalTime } from '@renderer/lib/date'

/** Current time (24-hour) with the full date above it, styled like a paper desk calendar. */
export default function ClockWidget(): React.JSX.Element {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const weekday = now.toLocaleDateString(UI_LOCALE, { weekday: 'long' })
  const date = formatNumericDate(now)

  return (
    <section
      aria-label="Clock"
      className="overflow-hidden rounded-md border border-border bg-bg text-center"
    >
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
    </section>
  )
}
