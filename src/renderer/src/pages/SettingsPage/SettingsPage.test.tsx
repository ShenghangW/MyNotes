import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SettingsPage from './SettingsPage'
import { TEST_USER_DATA_PATH, createMockApi } from '../../../../test/mockApi'

describe('SettingsPage', () => {
  it('shows the local data folder from the app API', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('data-path').textContent).toBe(TEST_USER_DATA_PATH)
    })
    expect(screen.getByTestId('reminder-lead').textContent).toBe('1 day')
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
