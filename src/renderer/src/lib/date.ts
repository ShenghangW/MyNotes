/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's clock). */
export function toLocalIsoDate(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** True when a YYYY-MM-DD due date is before `today` (same format). */
export function isOverdue(dueDate: string | null, today: string = toLocalIsoDate()): boolean {
  return dueDate !== null && dueDate < today
}

/** "Oct 20" style label for a YYYY-MM-DD date; falls back to the raw string. */
export function formatDueDate(dueDate: string): string {
  const [year, month, day] = dueDate.split('-').map(Number)
  if (!year || !month || !day) {
    return dueDate
  }
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
}

/** Local 24-hour time as HH:MM. */
export function toLocalTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
