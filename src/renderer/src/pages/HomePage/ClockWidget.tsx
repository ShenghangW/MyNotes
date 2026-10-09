import { useEffect, useState } from 'react'
import { toLocalTime } from '@renderer/lib/date'

/** Current time (24-hour) with the full date above it, styled like a paper desk calendar. */
export default function ClockWidget(): React.JSX.Element {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' })
  const date = now.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <section
      aria-label="Clock"
      className="overflow-hidden rounded-md border border-[#e4dcc6] bg-[#fbf7ea] text-center"
    >
      <div className="border-b border-dashed border-[#d8cfb4] px-4 py-2">
        <p className="text-xs tracking-wide text-[#8a7f62] uppercase">{weekday}</p>
        <p className="text-sm text-[#5d5440]">{date}</p>
      </div>
      <p
        className="px-4 py-4 text-5xl font-light tracking-tight text-[#3d3626] tabular-nums"
        data-testid="clock-time"
      >
        {toLocalTime(now)}
      </p>
    </section>
  )
}
