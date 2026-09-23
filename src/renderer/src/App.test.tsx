import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
})
