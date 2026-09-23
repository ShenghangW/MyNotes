export type AppPage = 'home' | 'notes' | 'calendar' | 'timetable' | 'settings'

export const APP_PAGES: readonly { id: AppPage; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'notes', label: 'Notes' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'timetable', label: 'Timetable' },
  { id: 'settings', label: 'Settings' }
]
