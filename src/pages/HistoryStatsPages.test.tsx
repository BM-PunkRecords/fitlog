import type { ReactElement } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HistoryPage, StatsPage } from './HistoryStatsPages'
import type { Session } from '../types/models'

// Shared, test-controlled session list backing the mocked store.
const state: { sessions: Session[] } = { sessions: [] }

vi.mock('../context/AppDataContext', () => ({
  useAppData: () => ({
    catalog: [],
    // Pages look exercises up through the shared index (it also resolves ids
    // that were merged away); empty here so names fall back to the raw id.
    exerciseById: new Map(),
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
  it('offers range tabs and shows an empty hint with no data', async () => {
    renderPage(<StatsPage />)
    expect(screen.getByRole('heading', { level: 1, name: '통계' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText(/운동을 완료하면/)).toBeInTheDocument(),
    )
    // 7일·30일·전체를 고를 수 있어야 한다(예전엔 최근 7일 고정).
    expect(screen.getByRole('tab', { name: '최근 7일' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '전체' })).toBeInTheDocument()
  })

  it('counts recent completed sessions and hides the empty hint', async () => {
    state.sessions = [completedSession()]
    renderPage(<StatsPage />)

    await waitFor(() => expect(screen.getByText('세션')).toBeInTheDocument())
    expect(screen.queryByText(/운동을 완료하면/)).not.toBeInTheDocument()
    // 볼륨만이 아니라 세트·운동한 날·부위 분포까지 나온다.
    expect(screen.getByText('총 세트')).toBeInTheDocument()
    expect(screen.getByText('운동한 날')).toBeInTheDocument()
    expect(screen.getByText('부위 분포')).toBeInTheDocument()
    expect(screen.getAllByText('400 kg').length).toBeGreaterThan(0)
  })

  it('switches to the all-time range', async () => {
    const user = userEvent.setup()
    // 100일 전 세션 — 7일엔 안 잡히고 전체에서만 잡힌다.
    const old = completedSession()
    old.id = 'old'
    old.endedAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
    old.startedAt = old.endedAt
    state.sessions = [old]
    renderPage(<StatsPage />)

    await waitFor(() => expect(screen.getByText(/운동을 완료하면/)).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: '전체' }))
    await waitFor(() => expect(screen.queryByText(/운동을 완료하면/)).not.toBeInTheDocument())
    expect(screen.getByText('세션')).toBeInTheDocument()
  })
})
