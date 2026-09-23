import { useCallback, useEffect, useState } from 'react'
import Sidebar from '@renderer/components/Sidebar'
import CalendarPage from '@renderer/pages/CalendarPage/CalendarPage'
import HomePage from '@renderer/pages/HomePage/HomePage'
import NotesPage from '@renderer/pages/NotesPage/NotesPage'
import SettingsPage from '@renderer/pages/SettingsPage/SettingsPage'
import TimetablePage from '@renderer/pages/TimetablePage/TimetablePage'
import type { AppPage } from '@renderer/types'

const PAGES: Record<AppPage, () => React.JSX.Element> = {
  home: HomePage,
  notes: NotesPage,
  calendar: CalendarPage,
  timetable: TimetablePage,
  settings: SettingsPage
}

export default function App(): React.JSX.Element {
  const [page, setPage] = useState<AppPage>('home')
  const [collapsed, setCollapsed] = useState(false)

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => !value)
  }, [])

  const addNote = useCallback(() => {
    setPage('notes')
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.key === '\\') {
        event.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleCollapsed])

  const Page = PAGES[page]

  return (
    <div className="flex h-full min-h-0 bg-bg">
      <Sidebar
        currentPage={page}
        collapsed={collapsed}
        onNavigate={setPage}
        onToggleCollapsed={toggleCollapsed}
        onAddNote={addNote}
      />
      <main className="min-w-0 flex-1 overflow-auto p-6">
        <Page />
      </main>
    </div>
  )
}
