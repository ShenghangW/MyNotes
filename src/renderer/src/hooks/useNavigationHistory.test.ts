import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useNavigationHistory } from './useNavigationHistory'

describe('useNavigationHistory', () => {
  it('starts on Home with nothing to go back or forward to', () => {
    const { result } = renderHook(() => useNavigationHistory())
    expect(result.current.location).toEqual({ page: 'home', noteId: null })
    expect(result.current.canGoBack).toBe(false)
    expect(result.current.canGoForward).toBe(false)
  })

  it('goes back and forward through pages and open notes', () => {
    const { result } = renderHook(() => useNavigationHistory())
    act(() => result.current.navigate({ page: 'notes', noteId: null }))
    act(() => result.current.navigate({ page: 'notes', noteId: 'n1' }))
    act(() => result.current.navigate({ page: 'calendar', noteId: null }))

    act(() => result.current.back())
    expect(result.current.location).toEqual({ page: 'notes', noteId: 'n1' })
    act(() => result.current.back())
    expect(result.current.location).toEqual({ page: 'notes', noteId: null })
    act(() => result.current.forward())
    expect(result.current.location).toEqual({ page: 'notes', noteId: 'n1' })
  })

  it('does not add an entry for the page you are already on', () => {
    const { result } = renderHook(() => useNavigationHistory())
    act(() => result.current.navigate({ page: 'home', noteId: null }))
    expect(result.current.canGoBack).toBe(false)
  })

  it('drops forward history when navigating somewhere new', () => {
    const { result } = renderHook(() => useNavigationHistory())
    act(() => result.current.navigate({ page: 'notes', noteId: null }))
    act(() => result.current.navigate({ page: 'calendar', noteId: null }))
    act(() => result.current.back())
    act(() => result.current.navigate({ page: 'settings', noteId: null }))
    expect(result.current.canGoForward).toBe(false)
    act(() => result.current.back())
    expect(result.current.location.page).toBe('notes')
  })

  it('stops at both ends', () => {
    const { result } = renderHook(() => useNavigationHistory())
    act(() => result.current.back())
    act(() => result.current.forward())
    expect(result.current.location.page).toBe('home')
  })
})
