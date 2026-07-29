import type { ReactElement } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HistoryPage, StatsPage } from './HistoryStatsPages'
import type { Session } from '../types/models'

// Shared, test-controlled session list backing the mocked store.
const state: { sessions: Session[] } = { sessions: [] }

vi.mock('../context/AppDataContext', () => ({
  useAppData: () => ({
    catalog: [],
    store: {
      listSessions: vi.fn(async () => state.sessions),
      getSession: vi.fn(async (id: string) => state.sessions.find((s) => s.id === id) ?? null),
    },
  }),
}))

function completedSession(): Session {
  const now = new Date().toISOString()
  return {
    id: 's1',
    routineId: null,
    startedAt: now,
    endedAt: now,
    status: 'completed',
    items: [
      {
        exerciseId: 'bench',
        order: 0,
        sets: [{ setNumber: 1, weightKg: 40, reps: 10, completed: true }],
      },
    ],
  }
}

afterEach(() => {
  state.sessions = []
  cleanup()
})

function renderPage(node: ReactElement) {
  return render(<MemoryRouter>{node}</MemoryRouter>)
}

describe('HistoryPage hierarchy', () => {
  it('shows a polished empty state when there are no completed sessions', async () => {
    renderPage(<HistoryPage />)
    expect(screen.getByRole('heading', { level: 1, name: '기록' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('완료된 세션이 아직 없어요')).toBeInTheDocument(),
    )
  })

  it('groups completed sessions under a date heading with tappable cards', async () => {
    state.sessions = [completedSession()]
    renderPage(<HistoryPage />)

    await waitFor(() => expect(screen.getByText('자유운동')).toBeInTheDocument())
    // h1 page title + at least one h2 date section = logical heading order.
    expect(screen.getByRole('heading', { level: 1, name: '기록' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0)

    const card = screen.getByRole('link', { name: /자유운동 상세 보기/ })
    expect(card).toHaveAttribute('href', '/history/s1')
    expect(card).toHaveTextContent('볼륨 400kg')
  })
})

describe('StatsPage emphasis', () => {
  it('emphasises the weekly numbers and shows an empty hint with no data', async () => {
    renderPage(<StatsPage />)
    expect(screen.getByRole('heading', { level: 1, name: '통계' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('이번 주 기록이 아직 없어요')).toBeInTheDocument(),
    )
    expect(screen.getByText('세션')).toBeInTheDocument()
    expect(screen.getByText('총 볼륨')).toBeInTheDocument()
  })

  it('counts recent completed sessions and hides the empty hint', async () => {
    state.sessions = [completedSession()]
    renderPage(<StatsPage />)

    await waitFor(() =>
      expect(screen.queryByText('이번 주 기록이 아직 없어요')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('400 kg')).toBeInTheDocument()
  })
})
