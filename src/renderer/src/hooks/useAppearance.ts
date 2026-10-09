import { useSyncExternalStore } from 'react'
import {
  getAppearance,
  getResolvedMode,
  setAppearance,
  subscribeAppearance,
  type Appearance,
  type ResolvedMode
} from '@renderer/lib/appearance'

export function useAppearance(): {
  appearance: Appearance
  resolvedMode: ResolvedMode
  setTheme: (theme: Appearance['theme']) => void
  setMode: (mode: Appearance['mode']) => void
} {
  const appearance = useSyncExternalStore(subscribeAppearance, getAppearance)
  const resolvedMode = useSyncExternalStore(subscribeAppearance, getResolvedMode)
  return {
    appearance,
    resolvedMode,
    setTheme: (theme) => setAppearance({ theme }),
    setMode: (mode) => setAppearance({ mode })
  }
}
