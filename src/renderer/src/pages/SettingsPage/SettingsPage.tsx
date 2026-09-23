import { useEffect, useState } from 'react'
import type { AppSettings } from '@shared/api'

export default function SettingsPage(): React.JSX.Element {
  const [dataPath, setDataPath] = useState<string | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async (): Promise<void> => {
      const [pathResult, settingsResult] = await Promise.all([
        window.api.app.getUserDataPath(),
        window.api.settings.get()
      ])
      if (cancelled) {
        return
      }
      if (!pathResult.ok) {
        setError(pathResult.error)
        return
      }
      if (!settingsResult.ok) {
        setError(settingsResult.error)
        return
      }
      setDataPath(pathResult.data)
      setSettings(settingsResult.data)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section>
      <h1 className="text-[20px] font-medium tracking-tight">Settings</h1>
      <p className="mt-2 max-w-xl text-sm text-text-muted">
        Note groups and reminder controls come next. Your data stays in this folder on this
        computer.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}

      <dl className="mt-6 max-w-2xl space-y-4 rounded-md border border-border bg-surface p-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">Data folder</dt>
          <dd className="mt-1 break-all font-mono text-sm text-text" data-testid="data-path">
            {dataPath ?? 'Loading…'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">Reminder lead time</dt>
          <dd className="mt-1 text-sm text-text" data-testid="reminder-lead">
            {settings ? `${settings.reminderLeadDays} day${settings.reminderLeadDays === 1 ? '' : 's'}` : 'Loading…'}
          </dd>
        </div>
      </dl>
    </section>
  )
}
