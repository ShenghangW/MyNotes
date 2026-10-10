const SIZE = 168
const THICK = 12
const THIN = 2
const RADIUS = (SIZE - THICK) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type TimerRingProps = {
  /** 0 = the ring is full and thick, 1 = it has thinned out completely. */
  thinning: number
  /** How much of the circle is drawn (1 = full circle). */
  arc?: number
  children: React.ReactNode
}

/**
 * The outer ring of the timer and stopwatch. Like the Apple stopwatch it starts as a full,
 * thick ring and gets thinner as time passes.
 */
export default function TimerRing({
  thinning,
  arc = 1,
  children
}: TimerRingProps): React.JSX.Element {
  const clamped = Math.min(1, Math.max(0, thinning))
  const strokeWidth = THICK - (THICK - THIN) * clamped
  const visibleArc = Math.min(1, Math.max(0, arc))

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={THIN}
        />
        <circle
          data-testid="timer-ring"
          data-stroke-width={strokeWidth.toFixed(2)}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - visibleArc)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
