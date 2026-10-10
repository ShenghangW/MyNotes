import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EVENTS_CHANGED } from '../../hooks/useEvents'
import SettingsPage from './SettingsPage'
import { TEST_USER_DATA_PATH, createMockApi } from '../../../../test/mockApi'

describe('SettingsPage', () => {
  it('shows the local data folder from the app API', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('data-path').textContent).toBe(TEST_USER_DATA_PATH)
    })
    const select = (await screen.findByLabelText('Remind me before an event')) as HTMLSelectElement
    expect(select.value).toBe('1')
  })

  it('saves a new reminder lead time and tells the reminder popup to re-check', async () => {
    const base = createMockApi()
    const update = vi.fn(async (patch: { reminderLeadDays?: 1 | 2 }) => ({
      ok: true as const,
      data: {
        reminderLeadDays: patch.reminderLeadDays ?? 1,
        homeTitle: 'Home',
        homePhotoPath: null,
        homePhotoVisible: true,
        updatedAt: ''
      }
    }))
    window.api = createMockApi({ settings: { ...base.settings, update } })
    const onChanged = vi.fn()
    window.addEventListener(EVENTS_CHANGED, onChanged)

    render(<SettingsPage />)
    const select = (await screen.findByLabelText('Remind me before an event')) as HTMLSelectElement
    await waitFor(() => expect(select.disabled).toBe(false))
    fireEvent.change(select, { target: { value: '2' } })

    await waitFor(() => expect(update).toHaveBeenCalledWith({ reminderLeadDays: 2 }))
    await waitFor(() => expect(select.value).toBe('2'))
    expect(onChanged).toHaveBeenCalledTimes(1)
    window.removeEventListener(EVENTS_CHANGED, onChanged)
  })

  it('opens the data folder from the Open folder button', async () => {
    const base = createMockApi()
    const openUserDataFolder = vi.fn(async () => ({ ok: true as const, data: null }))
    window.api = createMockApi({ app: { ...base.app, openUserDataFolder } })

    render(<SettingsPage />)
    const button = screen.getByRole('button', { name: 'Open folder' }) as HTMLButtonElement
    await waitFor(() => expect(button.disabled).toBe(false))
    fireEvent.click(button)

    await waitFor(() => expect(openUserDataFolder).toHaveBeenCalledTimes(1))
  })

  it('shows an error when the folder cannot be opened', async () => {
    const base = createMockApi()
    window.api = createMockApi({
      app: {
        ...base.app,
        openUserDataFolder: async () => ({ ok: false as const, error: 'Could not open folder' })
      }
    })

    render(<SettingsPage />)
    const button = screen.getByRole('button', { name: 'Open folder' }) as HTMLButtonElement
    await waitFor(() => expect(button.disabled).toBe(false))
    fireEvent.click(button)

    expect((await screen.findByRole('alert')).textContent).toBe('Could not open folder')
  })

  it('switches colour mode from the Appearance card', () => {
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Dark' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(screen.getByRole('button', { name: 'Notion' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('switches the theme from the Appearance card', () => {
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Apple Glass' }))
    expect(document.documentElement.dataset.appearance).toBe('glass')
    expect(screen.getByRole('button', { name: 'Apple Glass' }).getAttribute('aria-pressed')).toBe(
      'true'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Notion' }))
    expect(document.documentElement.dataset.appearance).toBe('notion')
  })

  it('lists the keyboard shortcuts', () => {
    render(<SettingsPage />)
    const list = screen.getByTestId('shortcuts')
    expect(list.textContent).toContain('Ctrl+B')
    expect(list.textContent).toContain('Ctrl+S')
    expect(list.textContent).toContain('Ctrl+0')
  })

  it('manages note groups from Settings', async () => {
    let groups = [{ id: 'g1', name: 'School', sortOrder: 0, createdAt: '', updatedAt: '' }]
    const base = createMockApi()
    window.api = createMockApi({
      groups: {
        ...base.groups,
        list: vi.fn(async () => ({ ok: true as const, data: groups })),
        create: vi.fn(async ({ name }: { name: string }) => {
          const created = { id: 'g2', name, sortOrder: 1, createdAt: '', updatedAt: '' }
          groups = [...groups, created]
          return { ok: true as const, data: created }
        })
      }
    })

    render(<SettingsPage />)
    expect(await screen.findByText('School')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'New group' }))
    const input = screen.getByLabelText('New group name')
    fireEvent.change(input, { target: { value: 'Work' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(await screen.findByText('Work')).toBeTruthy()
    expect(window.api.groups.create).toHaveBeenCalledWith({ name: 'Work' })
  })
})
