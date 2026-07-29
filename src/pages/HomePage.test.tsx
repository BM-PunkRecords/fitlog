import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'
import { DEFAULT_SETTINGS } from '../types/models'
import type { Routine, Session } from '../types/models'

// Control the AppData context so we can render Home without IndexedDB.
const state: {
  inProgress: Session | undefined
  routines: Routine[]
} = { inProgress: undefined, routines: [] }

vi.mock('../context/AppDataContext', () => ({
  useAppData: () => ({
    routines: state.routines,
    catalog: [],
    inProgress: state.inProgress,
    store: { saveSession: vi.fn(), discardSession: vi.fn() },
    refresh: vi.fn(),
    settings: DEFAULT_SETTINGS,
  }),
}))

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  state.inProgress = undefined
  state.routines = []
  cleanup()
})

const routine: Routine = {
  id: 'r1',
  name: '가슴 루틴',
  exerciseIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('HomePage primary actions', () => {
  it('renders the primary CTA as a SEED action button (brand solid)', () => {
    renderHome()
    const cta = screen.getByRole('button', { name: '자유운동 시작' })
    expect(cta.className).toContain('seed-action-button')
    expect(cta.className).toContain('seed-action-button--variant_brandSolid')
  })

  it('keeps "루틴 추가" a real router link styled as a SEED action button', () => {
    renderHome()
    const addLink = screen.getByRole('link', { name: '루틴 추가' })
    expect(addLink).toHaveAttribute('href', '/routines/new')
    expect(addLink.className).toContain('seed-action-button')
  })

  it('shows an empty state with a next action when there are no routines', () => {
    renderHome()
    expect(screen.getByText('아직 루틴이 없어요')).toBeInTheDocument()
    const cta = screen.getByRole('link', { name: '첫 루틴 만들기' })
    expect(cta).toHaveAttribute('href', '/routines/new')
  })

  it('renders each routine as a labelled, tappable link when routines exist', () => {
    state.routines = [routine]
    renderHome()
    expect(screen.queryByText('아직 루틴이 없어요')).not.toBeInTheDocument()
    const card = screen.getByRole('link', { name: '가슴 루틴 루틴 열기' })
    expect(card).toHaveAttribute('href', '/routines/r1')
    expect(card).toHaveTextContent('가슴 루틴')
  })

  it('switches the primary CTA to "이어서 기록하기" when a session is in progress', () => {
    state.inProgress = {
      id: 's1',
      routineId: null,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      items: [],
    }
    renderHome()
    expect(screen.getByRole('button', { name: '이어서 기록하기' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '자유운동 시작' })).not.toBeInTheDocument()
  })
})
