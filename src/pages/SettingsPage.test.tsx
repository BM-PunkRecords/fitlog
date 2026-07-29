import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from './SettingsPage'
import { DEFAULT_SETTINGS } from '../types/models'

const setSettings = vi.fn(async () => {})

vi.mock('../context/AppDataContext', () => ({
  useAppData: () => ({
    settings: { ...DEFAULT_SETTINGS, defaultRestSeconds: 90 },
    setSettings,
  }),
}))

afterEach(() => {
  setSettings.mockClear()
  cleanup()
})

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  it('renders grouped settings with a page heading and rest-time section', () => {
    renderSettings()
    expect(screen.getByRole('heading', { level: 1, name: '설정' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '휴식 시간' })).toBeInTheDocument()
  })

  it('persists a new default rest duration when a preset is chosen', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.click(screen.getByRole('button', { name: '1분' }))

    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(setSettings).toHaveBeenCalledWith(
      expect.objectContaining({ defaultRestSeconds: 60 }),
    )
  })
})
