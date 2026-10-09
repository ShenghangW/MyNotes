/** Pure `YYYY-MM-DD` / `HH:MM` helpers shared by the main process and the UI. No timezone surprises. */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidIsoDate(value: string): boolean {
  const match = DATE_RE.exec(value)
  if (!match) {
    return false
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

/** 24-hour `HH:MM`. */
export function isValidTime(value: string): boolean {
  return TIME_RE.test(value)
}

function utcMs(date: string, time = '00:00'): number {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return Date.UTC(year, month - 1, day, hour, minute)
}

/** Whole days from `from` to `to`. Negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcMs(to) - utcMs(from)) / 86_400_000)
}

export function addDays(date: string, days: number): string {
  return new Date(utcMs(date) + days * 86_400_000).toISOString().slice(0, 10)
}

/** Minutes from the first date/time to the second (negative if the second is earlier). */
export function minutesBetween(
  fromDate: string,
  fromTime: string,
  toDate: string,
  toTime: string
): number {
  return Math.round((utcMs(toDate, toTime) - utcMs(fromDate, fromTime)) / 60_000)
}

export function addMinutes(
  date: string,
  time: string,
  minutes: number
): { date: string; time: string } {
  const iso = new Date(utcMs(date, time) + minutes * 60_000).toISOString()
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) }
}

/** `HH:MM` -> minutes after midnight. Assumes a valid 24-hour time. */
export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

/** Minutes after midnight -> `HH:MM` (0-1439). */
export function minutesToTime(minutes: number): string {
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0')
  const minute = String(minutes % 60).padStart(2, '0')
  return `${hour}:${minute}`
}
