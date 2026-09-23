/** Joins truthy class names. Used as a smoke-testable shared util. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
