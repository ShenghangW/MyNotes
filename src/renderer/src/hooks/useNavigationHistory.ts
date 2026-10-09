import { useCallback, useState } from 'react'
import type { AppPage } from '@renderer/types'

/** Where the user is: a page, plus the open note when on Notes. */
export type Location = { page: AppPage; noteId: string | null }

type History = { entries: Location[]; index: number }

const START: Location = { page: 'home', noteId: null }

function same(a: Location, b: Location): boolean {
  return a.page === b.page && a.noteId === b.noteId
}

/** Browser-style back/forward history for the app's pages and open notes. */
export function useNavigationHistory(): {
  location: Location
  canGoBack: boolean
  canGoForward: boolean
  navigate: (next: Location) => void
  back: () => void
  forward: () => void
} {
  const [history, setHistory] = useState<History>({ entries: [START], index: 0 })

  const navigate = useCallback((next: Location) => {
    setHistory((current) => {
      if (same(current.entries[current.index], next)) {
        return current
      }
      // Going somewhere new drops the forward entries, like a browser.
      const entries = [...current.entries.slice(0, current.index + 1), next]
      return { entries, index: entries.length - 1 }
    })
  }, [])

  const back = useCallback(() => {
    setHistory((current) =>
      current.index > 0 ? { ...current, index: current.index - 1 } : current
    )
  }, [])

  const forward = useCallback(() => {
    setHistory((current) =>
      current.index < current.entries.length - 1
        ? { ...current, index: current.index + 1 }
        : current
    )
  }, [])

  return {
    location: history.entries[history.index],
    canGoBack: history.index > 0,
    canGoForward: history.index < history.entries.length - 1,
    navigate,
    back,
    forward
  }
}
