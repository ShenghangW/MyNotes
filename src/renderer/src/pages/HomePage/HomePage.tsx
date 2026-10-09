import { useEffect, useState } from 'react'
import { DEFAULT_HOME_TITLE } from '@shared/api'
import EditableTitle from '@renderer/components/EditableTitle'
import { errorMessage, unwrap } from '@renderer/lib/ipc'
import TodoWidget from './TodoWidget'

export default function HomePage(): React.JSX.Element {
  const [title, setTitle] = useState(DEFAULT_HOME_TITLE)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      try {
        const settings = unwrap(await window.api.settings.get())
        if (!cancelled) {
          setTitle(settings.homeTitle)
        }
      } catch (caught) {
        if (!cancelled) {
          setError(errorMessage(caught))
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const saveTitle = async (next: string): Promise<boolean> => {
    try {
      const saved = unwrap(await window.api.settings.update({ homeTitle: next }))
      setTitle(saved.homeTitle)
      setError(null)
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      return false
    }
  }

  return (
    <section>
      <EditableTitle value={title} onSave={saveTitle} />

      {error ? (
        <p className="mt-2 text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 max-w-xl">
        <TodoWidget />
      </div>
    </section>
  )
}
