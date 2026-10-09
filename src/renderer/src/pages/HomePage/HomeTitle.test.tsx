import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings, SettingsPatch } from '@shared/api'
import { createMockApi } from '../../../../test/mockApi'
import HomePage from './HomePage'

describe('Home page title', () => {
  let saved: AppSettings

  beforeEach(() => {
    saved = {
      reminderLeadDays: 1,
      homeTitle: 'Home',
      homePhotoPath: null,
      homePhotoVisible: true,
      updatedAt: ''
    }
    const base = createMockApi()
    window.api = createMockApi({
      settings: {
        get: vi.fn(async () => ({ ok: true as const, data: saved })),
        update: vi.fn(async (patch: SettingsPatch) => {
          // Mirrors the main process: trim, and blank resets to "Home".
          const title = patch.homeTitle === undefined ? saved.homeTitle : patch.homeTitle.trim()
          saved = { ...saved, homeTitle: title === '' ? 'Home' : title }
          return { ok: true as const, data: saved }
        })
      },
      todos: base.todos
    })
  })

  it('no longer shows the description under the title', async () => {
    render(<HomePage />)
    await screen.findByRole('heading', { name: 'Home' })
    expect(screen.queryByText(/Daily overview/)).toBeNull()
  })

  it('shows the saved title', async () => {
    saved = { ...saved, homeTitle: 'Good morning' }
    render(<HomePage />)
    expect(await screen.findByRole('heading', { name: 'Good morning' })).toBeTruthy()
  })

  it('renames the title with Enter and saves it', async () => {
    render(<HomePage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rename page title' }))

    const input = screen.getByLabelText('Page title')
    fireEvent.change(input, { target: { value: '  My week  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByRole('heading', { name: 'My week' })).toBeTruthy()
    expect(window.api.settings.update).toHaveBeenCalledWith({ homeTitle: 'My week' })
    expect(screen.queryByLabelText('Page title')).toBeNull()
  })

  it('can also be renamed by clicking the heading and saves on blur', async () => {
    render(<HomePage />)
    fireEvent.click(await screen.findByRole('heading', { name: 'Home' }))

    const input = screen.getByLabelText('Page title')
    fireEvent.change(input, { target: { value: 'Dashboard' } })
    fireEvent.blur(input)

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    expect(window.api.settings.update).toHaveBeenCalledTimes(1)
  })

  it('Escape cancels without saving', async () => {
    render(<HomePage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rename page title' }))

    const input = screen.getByLabelText('Page title')
    fireEvent.change(input, { target: { value: 'Nope' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.getByRole('heading', { name: 'Home' })).toBeTruthy()
    expect(window.api.settings.update).not.toHaveBeenCalled()
  })

  it('a blank title falls back to Home', async () => {
    saved = { ...saved, homeTitle: 'Custom' }
    render(<HomePage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rename page title' }))

    const input = screen.getByLabelText('Page title')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeTruthy()
  })

  it('keeps editing and shows an error when saving fails', async () => {
    window.api.settings.update = vi.fn(async () => ({ ok: false as const, error: 'disk full' }))
    render(<HomePage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rename page title' }))

    const input = screen.getByLabelText('Page title')
    fireEvent.change(input, { target: { value: 'Broken' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect((await screen.findByRole('alert')).textContent).toBe('disk full')
    await waitFor(() => expect(screen.getByLabelText('Page title')).toBeTruthy())
  })
})
