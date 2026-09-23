import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SettingsPage from './SettingsPage'
import { TEST_USER_DATA_PATH } from '../../../../test/mockApi'

describe('SettingsPage', () => {
  it('shows the local data folder from the app API', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('data-path').textContent).toBe(TEST_USER_DATA_PATH)
    })
    expect(screen.getByTestId('reminder-lead').textContent).toBe('1 day')
  })
})
