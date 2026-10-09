import { useEffect, useState } from 'react'
import type { AppSettings } from '@shared/api'
import NoteGroupManager from '@renderer/components/NoteGroupManager'
import { useAppearance } from '@renderer/hooks/useAppearance'
import { EVENTS_CHANGED } from '@renderer/hooks/useEvents'
import { COLOR_MODES, THEMES } from '@renderer/lib/appearance'
import { cn } from '@renderer/lib/cn'
import { errorMessage, unwrap } from '@renderer/lib/ipc'

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl+B or Ctrl+\\', action: 'Expand / collapse the sidebar' },
  { keys: 'Ctrl+S', action: 'Save everything now' },
  { keys: 'Ctrl + / Ctrl -', action: 'Zoom the app in / out' },
  { keys: 'Ctrl+0', action: 'Reset zoom' },
  { keys: 'Alt+← / Alt+→', action: 'Go back / forward' }
]

export default function SettingsPage(): React.JSX.Element {
  const [dataPath, setDataPath] = useState<string | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { appearance, setTheme, setMode } = useAppearance()

  useEffect(() => {
    let cancelled = false

    const load = async (): Promise<void> => {
      try {
        const [path, loaded] = await Promise.all([
          window.api.app.getUserDataPath().then(unwrap),
          window.api.settings.get().then(unwrap)
        ])
        if (!cancelled) {
          setDataPath(path)
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

  const changeLeadDays = async (value: string): Promise<void> => {
    const reminderLeadDays = value === '2' ? 2 : 1
    setSaving(true)
    setError(null)
    try {
      setSettings(unwrap(await window.api.settings.update({ reminderLeadDays })))
      // Tell the reminder popup to re-check right away with the new lead time.
      window.dispatchEvent(new Event(EVENTS_CHANGED))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const openFolder = async (): Promise<void> => {
    setError(null)
    try {
      unwrap(await window.api.app.openUserDataFolder())
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 max-w-xl text-sm text-text-muted">
        Everything is stored locally on this computer. Changes save automatically.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 max-w-2xl rounded-md border border-border bg-surface p-4">
        <h2 className="text-xs uppercase tracking-wide text-text-muted">Appearance</h2>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-text" id="theme-label">
              Theme
            </p>
            <p className="text-sm text-text-muted">More themes will be added later.</p>
          </div>
          <div role="group" aria-labelledby="theme-label" className="flex gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                aria-pressed={appearance.theme === theme.id}
                title={theme.description}
                className={cn(
                  'h-8 rounded-sm border px-3 text-sm',
                  appearance.theme === theme.id
                    ? 'border-accent bg-hover font-medium text-text'
                    : 'border-border text-text-muted hover:bg-hover hover:text-text'
                )}
                onClick={() => setTheme(theme.id)}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text" id="mode-label">
            Colour mode
          </p>
          <div role="group" aria-labelledby="mode-label" className="flex gap-2">
            {COLOR_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                aria-pressed={appearance.mode === mode.id}
                className={cn(
                  'h-8 rounded-sm border px-3 text-sm',
                  appearance.mode === mode.id
                    ? 'border-accent bg-hover font-medium text-text'
                    : 'border-border text-text-muted hover:bg-hover hover:text-text'
                )}
                onClick={() => setMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 max-w-2xl rounded-md border border-border bg-surface p-4">
        <h2 className="text-xs uppercase tracking-wide text-text-muted">Reminders</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="reminder-lead-select" className="text-sm text-text">
            Remind me before an event
          </label>
          <select
            id="reminder-lead-select"
            className="rounded-sm border border-border bg-bg px-2 py-1 text-sm text-text"
            value={settings ? String(settings.reminderLeadDays) : '1'}
            disabled={!settings || saving}
            onChange={(event) => void changeLeadDays(event.target.value)}
          >
            <option value="1">1 day before</option>
            <option value="2">2 days before</option>
          </select>
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Reminders pop up while the app is open, for events that have a reminder turned on.
        </p>
      </div>

      <div className="mt-4 max-w-2xl rounded-md border border-border bg-surface p-4">
        <h2 className="text-xs uppercase tracking-wide text-text-muted">Data folder</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p
            className="min-w-0 flex-1 break-all font-mono text-sm text-text"
            data-testid="data-path"
          >
            {dataPath ?? 'Loading…'}
          </p>
          <button
            type="button"
            className="rounded-sm border border-border px-3 py-1 text-sm text-text hover:text-accent disabled:opacity-50"
            disabled={!dataPath}
            onClick={() => void openFolder()}
          >
            Open folder
          </button>
        </div>
      </div>

      <div className="mt-4 max-w-2xl rounded-md border border-border bg-surface p-4">
        <h2 className="text-xs uppercase tracking-wide text-text-muted">Note groups</h2>
        <p className="mt-1 mb-3 text-sm text-text-muted">
          Deleting a group keeps its notes; they become ungrouped.
        </p>
        <NoteGroupManager />
      </div>

      <div className="mt-4 max-w-2xl rounded-md border border-border bg-surface p-4">
        <h2 className="text-xs uppercase tracking-wide text-text-muted">Keyboard shortcuts</h2>
        <dl className="mt-3 space-y-2" data-testid="shortcuts">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-text">{shortcut.action}</dt>
              <dd className="font-mono text-xs text-text-muted">{shortcut.keys}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
