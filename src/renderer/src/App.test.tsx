import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createMockApi } from '../../test/mockApi'
import App from './App'
import { APP_PAGES } from './types'

describe('App shell', () => {
  it('renders five sidebar destinations and starts on Home', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Home' })).toBeTruthy()
    for (const page of APP_PAGES) {
      expect(screen.getByRole('button', { name: page.label })).toBeTruthy()
    }
  })

  it('switches the main page when a sidebar link is clicked', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
  })

  it('opens Notes when Add new note is clicked', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Add new note' }))
    expect(screen.getByRole('heading', { name: 'Notes' })).toBeTruthy()
  })

  it('collapses to icon-only navigation', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(screen.queryByText('Add new note')).toBeNull()
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Timetable' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Home' })).toBeTruthy()
  })

  it('puts Settings at the bottom of the sidebar, apart from the main links', () => {
    render(<App />)
    const main = screen.getByRole('navigation', { name: 'Main' })
    expect(main.textContent).not.toContain('Settings')
    const settings = screen.getByRole('button', { name: 'Settings' })
    expect(main.contains(settings)).toBe(false)
  })

  describe('back / forward', () => {
    const mouse = (button: number): void => {
      fireEvent.mouseDown(window, { button })
      fireEvent.mouseUp(window, { button })
    }

    it('mouse side buttons go back and forward through pages', () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
      fireEvent.click(screen.getByRole('button', { name: 'Timetable' }))

      mouse(3)
      expect(screen.getByRole('heading', { name: 'Calendar' })).toBeTruthy()
      mouse(3)
      expect(screen.getByRole('heading', { name: 'Home' })).toBeTruthy()
      mouse(4)
      expect(screen.getByRole('heading', { name: 'Calendar' })).toBeTruthy()
    })

    it('Alt+Left goes back, and does nothing when there is nowhere to go', () => {
      render(<App />)
      fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true })
      expect(screen.getByRole('heading', { name: 'Home' })).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
      fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true })
      expect(screen.getByRole('heading', { name: 'Home' })).toBeTruthy()
    })

    it('also follows the OS back command, and a duplicate click is ignored', () => {
      let send: (direction: 'back' | 'forward') => void = () => undefined
      const base = createMockApi()
      window.api = createMockApi({
        app: {
          ...base.app,
          onNavigate: (listener) => {
            send = listener
            return () => undefined
          }
        }
      })
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Calendar' }))
      fireEvent.click(screen.getByRole('button', { name: 'Timetable' }))

      act(() => send('back'))
      mouse(3) // the same physical click reported a second time
      expect(screen.getByRole('heading', { name: 'Calendar' })).toBeTruthy()
    })
  })
})
