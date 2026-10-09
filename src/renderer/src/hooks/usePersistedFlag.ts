import { useCallback, useState } from 'react'

/** A true/false setting remembered between visits (kept on this computer only). */
export function usePersistedFlag(key: string, initial: boolean): [boolean, () => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem(key)
      return saved === null ? initial : saved === '1'
    } catch {
      return initial
    }
  })

  const toggle = useCallback(() => {
    setValue((current) => {
      const next = !current
      try {
        window.localStorage.setItem(key, next ? '1' : '0')
      } catch {
        // Not remembering is fine; the toggle still works for this visit.
      }
      return next
    })
  }, [key])

  return [value, toggle]
}
