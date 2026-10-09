import { useCallback, useEffect, useState } from 'react'
import ReminderPopup from '@renderer/components/ReminderPopup'
import Sidebar from '@renderer/components/Sidebar'
import CalendarPage from '@renderer/pages/CalendarPage/CalendarPage'
import HomePage from '@renderer/pages/HomePage/HomePage'
import NotesPage from '@renderer/pages/NotesPage/NotesPage'
import SettingsPage from '@renderer/pages/SettingsPage/SettingsPage'
import TimetablePage from '@renderer/pages/TimetablePage/TimetablePage'
import { useNavigationHistory } from '@renderer/hooks/useNavigationHistory'
import type { AppPage } from '@renderer/types'

const PAGES: Record<Exclude<AppPage, 'notes'>, () => React.JSX.Element> = {
  home: HomePage,
  calendar: CalendarPage,
  timetable: TimetablePage,
  settings: SettingsPage
}

export default function App(): React.JSX.Element {
  const { location, navigate, back, forward } = useNavigationHistory()
  const page = location.page
  const setPage = useCallback((next: AppPage) => navigate({ page: next, noteId: null }), [navigate])
  const setOpenNote = useCallback(
    (noteId: string | null) => navigate({ page: 'notes', noteId }),
    [navigate]
  )
  const [collapsed, setCollapsed] = useState(false)
  const [createNoteRequested, setCreateNoteRequested] = useState(false)

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => !value)
  }, [])

  const addNote = useCallback(() => {
    setPage('notes')
    setCreateNoteRequested(true)
  }, [setPage])

  const handleCreateHandled = useCallback(() => {
    setCreateNoteRequested(false)
  }, [])

  // Mouse side buttons (back = button 3, forward = button 4) and Alt+←/→ move through history.
  // Windows may report the same click twice (as a mouse event and as an OS command), so ignore a repeat.
  useEffect(() => {
    let last = { direction: '', source: '', time: 0 }
    const go = (direction: 'back' | 'forward', source: 'mouse' | 'os' | 'keyboard'): void => {
      const now = Date.now()
      // One physical click can arrive twice, via a mouse event and an OS command: skip that echo.
      if (
        direction === last.direction &&
        source !== last.source &&
        source !== 'keyboard' &&
        now - last.time < 250
      ) {
        return
      }
      last = { direction, source, time: now }
      if (direction === 'back') {
        back()
      } else {
        forward()
      }
    }
    const directionFor = (button: number): 'back' | 'forward' | null =>
      button === 3 ? 'back' : button === 4 ? 'forward' : null

    const onMouseDown = (event: MouseEvent): void => {
      if (directionFor(event.button)) {
        event.preventDefault()
      }
    }
    const onMouseUp = (event: MouseEvent): void => {
      const direction = directionFor(event.button)
      if (direction) {
        event.preventDefault()
        go(direction, 'mouse')
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        go('back', 'keyboard')
      } else if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        go('forward', 'keyboard')
      }
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keydown', onKeyDown)
    const unsubscribe = window.api.app.onNavigate((direction) => go(direction, 'os'))
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('keydown', onKeyDown)
      unsubscribe()
    }
  }, [back, forward])

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

  const Page = page === 'notes' ? null : PAGES[page]

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
        {Page ? (
          <Page />
        ) : (
          <NotesPage
            createRequested={createNoteRequested}
            onCreateHandled={handleCreateHandled}
            openNoteId={location.noteId}
            onOpenNoteChange={setOpenNote}
          />
        )}
      </main>
      <ReminderPopup />
    </div>
  )
}
