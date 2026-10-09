import { useEffect, useState } from 'react'
import { DEFAULT_HOME_TITLE, type AppSettings, type SettingsPatch } from '@shared/api'
import EditableTitle from '@renderer/components/EditableTitle'
import { errorMessage, unwrap } from '@renderer/lib/ipc'
import ClockWidget from './ClockWidget'
import PhotoWidget from './PhotoWidget'
import RecentNotesWidget from './RecentNotesWidget'
import TodoWidget from './TodoWidget'
import UpcomingWidget from './UpcomingWidget'

type HomePageProps = {
  onOpenNote?: (id: string) => void
  onOpenCalendar?: () => void
}

export default function HomePage({ onOpenNote, onOpenCalendar }: HomePageProps): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      try {
        const loaded = unwrap(await window.api.settings.get())
        if (!cancelled) {
          setSettings(loaded)
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

  const saveSettings = async (patch: SettingsPatch): Promise<boolean> => {
    try {
      setSettings(unwrap(await window.api.settings.update(patch)))
      setError(null)
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      return false
    }
  }

  return (
    <section>
      <EditableTitle
        value={settings?.homeTitle ?? DEFAULT_HOME_TITLE}
        onSave={(next) => saveSettings({ homeTitle: next })}
      />

      {error ? (
        <p className="mt-2 text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-4">
          <TodoWidget />
          <RecentNotesWidget onOpenNote={onOpenNote} />
        </div>
        <div className="space-y-4">
          <ClockWidget />
          <UpcomingWidget onOpenCalendar={onOpenCalendar} />
          {settings ? (
            <PhotoWidget
              photoPath={settings.homePhotoPath}
              visible={settings.homePhotoVisible}
              onChange={saveSettings}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
