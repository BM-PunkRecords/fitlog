import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { DEFAULT_SETTINGS } from './types/models'

// Control the AppData `ready` flag directly so we can assert both gate states
// without racing IndexedDB hydration.
const state = { ready: false }

vi.mock('./context/AppDataContext', () => ({
  AppDataProvider: ({ children }: { children: ReactNode }) => children,
  useAppData: () => ({
    ready: state.ready,
    store: {} as never,
    catalog: [],
    customExercises: [],
    recentExerciseIds: [],
    frequentExerciseIds: [],
    settings: DEFAULT_SETTINGS,
    routines: [],
    inProgress: undefined,
    refresh: async () => {},
    setSettings: async () => {},
    toggleFavorite: async () => {},
    saveCustomExercise: async () => {},
    removeCustomExercise: async () => {},
  }),
}))

beforeEach(() => {
  state.ready = false
  window.history.pushState({}, '', '/')
})

afterEach(cleanup)

describe('App startup gate', () => {
  it('shows only the splash while not ready — no routes, nav or ad', () => {
    render(<App />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('FitLog')).toBeInTheDocument()

    // Bottom chrome and routed content must not mount yet.
    expect(document.querySelector('.bottom-chrome')).toBeNull()
    expect(document.querySelector('.bottom-anchor')).toBeNull()
    expect(document.querySelector('.bottom-ad')).toBeNull()
    expect(document.querySelector('.app-shell')).toBeNull()
    expect(screen.queryByRole('navigation', { name: '주요 메뉴' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '홈' })).not.toBeInTheDocument()
  })

  it('renders the app shell, bottom nav and ad once ready', () => {
    const { rerender } = render(<App />)
    state.ready = true
    rerender(<App />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(document.querySelector('.app-shell')).not.toBeNull()
    expect(document.querySelector('.bottom-chrome')).not.toBeNull()
    expect(document.querySelector('.bottom-ad')).not.toBeNull()
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument()
    // Home content is mounted.
    expect(screen.getByRole('heading', { name: 'FitLog' })).toBeInTheDocument()
  })
})
