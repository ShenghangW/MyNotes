/** Event colours (readable with white text). Events cycle through these unless one is picked. */
export const EVENT_COLORS = [
  { id: 'blue', label: 'Blue', hex: '#3b78e7' },
  { id: 'red', label: 'Red', hex: '#d64545' },
  { id: 'orange', label: 'Orange', hex: '#e07b22' },
  { id: 'yellow', label: 'Yellow', hex: '#b88a0f' },
  { id: 'green', label: 'Green', hex: '#2e9e5b' },
  { id: 'teal', label: 'Teal', hex: '#1f94a3' },
  { id: 'purple', label: 'Purple', hex: '#8e5bd0' },
  { id: 'pink', label: 'Pink', hex: '#d6559b' }
] as const

export type EventColorId = (typeof EVENT_COLORS)[number]['id']

export const DEFAULT_EVENT_COLOR: EventColorId = 'blue'

export function isEventColor(value: unknown): value is EventColorId {
  return EVENT_COLORS.some((color) => color.id === value)
}

export function eventColorHex(id: string): string {
  return (EVENT_COLORS.find((color) => color.id === id) ?? EVENT_COLORS[0]).hex
}

/** The colour a new event gets when none is chosen: cycles so neighbours differ. */
export function nextEventColor(existingCount: number): EventColorId {
  return EVENT_COLORS[existingCount % EVENT_COLORS.length].id
}
