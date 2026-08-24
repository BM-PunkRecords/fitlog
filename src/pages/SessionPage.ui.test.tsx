import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { LocalWorkoutStore } from '../store/LocalWorkoutStore'
import type { Session } from '../types/models'

const AD_SCRIPT_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7426857657290789'

const SESSION_ID = 'sess-ui-1'
const BENCH = '0025' // Barbell Bench Press
const OTHER = '0489' // 45 Degree Hyperextension

function sets() {
  return [
    { setNumber: 1, weightKg: 0, reps: 0, completed: false },
    { setNumber: 2, weightKg: 0, reps: 0, completed: false },
  ]
}

function seedSession(): Session {
  return {
    id: SESSION_ID,
    routineId: null,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    items: [
      { exerciseId: BENCH, order: 0, sets: sets(), restSecondsDefault: 90 },
      { exerciseId: OTHER, order: 1, sets: sets(), restSecondsDefault: 90 },
    ],
  }
}

beforeEach(async () => {
  indexedDB = new IDBFactory()
  const seedStore = new LocalWorkoutStore()
  await seedStore.saveSession(seedSession())

  window.history.pushState({}, '', `/session/${SESSION_ID}`)
  const script = document.createElement('script')
  script.src = AD_SCRIPT_SRC
  script.dataset.loaded = '1'
  document.head.appendChild(script)
  window.adsbygoogle = []
})

afterEach(() => {
  cleanup()
  document.querySelectorAll('script[src*="adsbygoogle.js"]').forEach((el) => el.remove())
  delete window.adsbygoogle
  document.body.classList.remove('lock-pull-refresh')
  document.documentElement.classList.remove('lock-pull-refresh')
  vi.restoreAllMocks()
})

describe('SessionPage session UI', () => {
  it('locks pull-to-refresh while the session is in progress and releases it on unmount', async () => {
    const { unmount } = render(<App />)

    await waitFor(() => expect(document.body.classList.contains('lock-pull-refresh')).toBe(true))
    expect(document.documentElement.classList.contains('lock-pull-refresh')).toBe(true)

    unmount()

    expect(document.body.classList.contains('lock-pull-refresh')).toBe(false)
    expect(document.documentElement.classList.contains('lock-pull-refresh')).toBe(false)
  })

  it('opens exercise info by tapping the demo media, with no separate 정보 button', async () => {
    const user = userEvent.setup()
    render(<App />)

    const media = await screen.findByRole('button', { name: /정보 보기$/ })
    // The old standalone text button is gone.
    expect(screen.queryByRole('button', { name: '정보' })).toBeNull()

    await user.click(media)

    // The info sheet renders the exercise detail sections.
    expect(await screen.findByText('단계')).toBeInTheDocument()
    expect(screen.getByText('폼 큐')).toBeInTheDocument()
  })

  it('exposes replace as a small labelled icon action on the exercise card', async () => {
    render(<App />)

    const replace = await screen.findByRole('button', { name: '운동 대체' })
    const card = replace.closest('.exercise-card')

    expect(card).not.toBeNull()
    expect(replace).toHaveClass('exercise-replace')
    // An icon (svg), not a text label, carries the meaning.
    expect(replace.querySelector('svg')).not.toBeNull()
  })

  it('offers prev/next navigation that is disabled at the session bounds', async () => {
    const user = userEvent.setup()
    render(<App />)

    const prev = await screen.findByRole('button', { name: '이전 운동' })
    const next = screen.getByRole('button', { name: '다음 운동' })

    // First exercise: cannot go back, can go forward.
    expect(prev).toBeDisabled()
    expect(next).toBeEnabled()

    await user.click(next)

    // Last exercise: can go back, cannot go forward.
    await waitFor(() => expect(next).toBeDisabled())
    expect(prev).toBeEnabled()

    await user.click(prev)
    await waitFor(() => expect(prev).toBeDisabled())
    expect(next).toBeEnabled()
  })

  it('moves between exercises by swiping, and ignores vertical scrolling', async () => {
    render(<App />)

    await screen.findByRole('button', { name: '운동 대체' })
    const zone = document.querySelector('.swipe-zone') as HTMLElement
    const heading = () => document.querySelector('.exercise-card h2')?.textContent
    const first = heading()

    const swipe = (dx: number, dy = 0) => {
      const from = { clientX: 220, clientY: 400 }
      const to = { clientX: 220 + dx, clientY: 400 + dy }
      fireEvent.touchStart(zone, { touches: [from], targetTouches: [from] })
      fireEvent.touchEnd(zone, { changedTouches: [to], touches: [] })
    }

    // A vertical drag is a scroll and must not change the exercise.
    swipe(0, -300)
    expect(heading()).toBe(first)

    // Swiping left advances to the next exercise.
    swipe(-140)
    await waitFor(() => expect(heading()).not.toBe(first))
    const second = heading()

    // Swiping right goes back.
    swipe(140)
    await waitFor(() => expect(heading()).toBe(first))
    expect(second).not.toBe(first)

    // At the first exercise a further right swipe is inert.
    swipe(140)
    expect(heading()).toBe(first)
  })

  it('does not swipe when the gesture starts on a numeric input', async () => {
    render(<App />)

    await screen.findByRole('button', { name: '운동 대체' })
    const zone = document.querySelector('.swipe-zone') as HTMLElement
    const input = zone.querySelector('input') as HTMLElement
    const before = document.querySelector('.exercise-card h2')?.textContent

    // Dragging across a value field selects text; it must not change exercise.
    const from = { clientX: 220, clientY: 400, target: input }
    fireEvent.touchStart(input, { touches: [from], targetTouches: [from] })
    fireEvent.touchEnd(zone, { changedTouches: [{ clientX: 80, clientY: 400 }], touches: [] })

    expect(document.querySelector('.exercise-card h2')?.textContent).toBe(before)
  })

  it('confirms before skipping an exercise that already has entered sets', async () => {
    const user = userEvent.setup()
    const store = new LocalWorkoutStore()
    const seeded = seedSession()
    seeded.items[0].sets[0] = { setNumber: 1, weightKg: 60, reps: 8, completed: true }
    await store.saveSession(seeded)

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)

    const skip = await screen.findByRole('button', { name: '이 운동 건너뛰기' })
    await user.click(skip)

    expect(confirmSpy).toHaveBeenCalled()
    // Declining keeps both exercises in the session.
    const after = await new LocalWorkoutStore().getSession(SESSION_ID)
    expect(after?.items).toHaveLength(2)
  })
})

describe('SessionPage set entry', () => {
  // Repeating the same load is the norm; retyping it every set is friction.
  it('copies the previous set values onto a new set', async () => {
    const user = userEvent.setup()
    const store = new LocalWorkoutStore()
    const seeded = seedSession()
    seeded.items[0].sets = [{ setNumber: 1, weightKg: 60, reps: 8, completed: false }]
    await store.saveSession(seeded)

    render(<App />)
    await screen.findByRole('button', { name: '운동 대체' })
    await user.click(screen.getByRole('button', { name: '+ 세트' }))

    await waitFor(() => {
      const weights = screen.getAllByLabelText(/중량\(kg\)/)
      expect(weights).toHaveLength(2)
      expect(weights[1]).toHaveValue(60)
    })
    expect(screen.getAllByLabelText(/횟수/)[1]).toHaveValue(8)
  })

  it('keeps the elapsed time pinned while scrolling', async () => {
    render(<App />)
    await screen.findByRole('button', { name: '운동 대체' })

    const header = document.querySelector('.session-header')
    expect(header).not.toBeNull()
    expect(header?.querySelector('.session-elapsed')).not.toBeNull()
  })

  it('saves a per-exercise note', async () => {
    const user = userEvent.setup()
    const saveSpy = vi.spyOn(LocalWorkoutStore.prototype, 'saveSession')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /메모/ }))
    await user.type(screen.getByLabelText('운동 메모'), '3번 머신')

    await waitFor(
      () => {
        const saved = saveSpy.mock.calls.at(-1)?.[0]
        expect(saved?.items[0].note).toBe('3번 머신')
      },
      { timeout: 3000 },
    )
  })
})

describe('SessionPage auto-advance', () => {
  async function completeAllSets(user: ReturnType<typeof userEvent.setup>) {
    const store = new LocalWorkoutStore()
    const seeded = seedSession()
    // One set left to tick, already filled in so it can be completed.
    seeded.items[0].sets = [{ setNumber: 1, weightKg: 60, reps: 8, completed: false }]
    await store.saveSession(seeded)

    render(<App />)
    await screen.findByRole('button', { name: '운동 대체' })
    await user.click(screen.getByRole('button', { name: '세트 1 완료' }))
  }

  // Finishing the last set means this exercise is done; making the user also
  // press "next" is a step with no decision in it.
  it('moves to the next exercise once the last set is ticked', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const first = () => document.querySelector('.exercise-card h2')?.textContent

    await completeAllSets(user)
    const before = first()

    await vi.advanceTimersByTimeAsync(1200)

    await waitFor(() => expect(first()).not.toBe(before))
  })

  it('stays put when the user already moved on their own', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await completeAllSets(user)
    // Jump ahead manually before the auto-advance fires.
    await user.click(screen.getByRole('button', { name: '다음 운동' }))
    const chosen = document.querySelector('.exercise-card h2')?.textContent

    await vi.advanceTimersByTimeAsync(1200)

    // The scheduled move must not push past where the user chose to be.
    expect(document.querySelector('.exercise-card h2')?.textContent).toBe(chosen)
  })
})

describe('SessionPage previous-record autofill', () => {
  async function seedPrevious(opts: { note?: string } = {}) {
    const store = new LocalWorkoutStore()
    const prior: Session = {
      id: 'sess-prev-1',
      routineId: null,
      startedAt: new Date(Date.now() - 86_400_000).toISOString(),
      endedAt: new Date(Date.now() - 86_400_000 + 3_600_000).toISOString(),
      status: 'completed',
      items: [
        {
          exerciseId: BENCH,
          order: 0,
          note: opts.note,
          sets: [
            { setNumber: 1, weightKg: 60, reps: 10, completed: true },
            { setNumber: 2, weightKg: 60, reps: 9, completed: true },
          ],
        },
      ],
    }
    await store.saveSession(prior)
  }

  it('prefills empty sets from the last completed session without marking them done', async () => {
    await seedPrevious()
    render(<App />)
    await screen.findByRole('button', { name: '운동 대체' })

    const weight1 = await screen.findByLabelText('세트 1 중량(kg)')
    await waitFor(() => expect(weight1).toHaveValue(60))
    expect(screen.getByLabelText('세트 1 횟수')).toHaveValue(10)
    expect(screen.getByLabelText('세트 2 중량(kg)')).toHaveValue(60)
    // 미리 채우기는 완료가 아니다 — 완료 버튼은 아직 비어 있는 ○.
    expect(screen.getByRole('button', { name: '세트 1 완료' })).toHaveTextContent('○')
  })

  it('leaves a touched exercise alone (no overwrite)', async () => {
    // 사용자가 이미 값을 넣은 운동으로 시작한다 — 자동 채우기가 덮어쓰면 안 된다.
    const store = new LocalWorkoutStore()
    const seeded = seedSession()
    seeded.items[0].sets = [{ setNumber: 1, weightKg: 42, reps: 5, completed: false }]
    await store.saveSession(seeded)
    await seedPrevious()

    render(<App />)
    await screen.findByRole('button', { name: '운동 대체' })
    const weight1 = await screen.findByLabelText('세트 1 중량(kg)')
    expect(weight1).toHaveValue(42)
  })

  it('shows the previous note in the 이전 기록 panel', async () => {
    const user = userEvent.setup()
    await seedPrevious({ note: '3번 머신, 손목 시큰' })
    render(<App />)
    await screen.findByRole('button', { name: '운동 대체' })

    await user.click(screen.getByRole('button', { name: /이전 기록/ }))
    expect(await screen.findByText(/3번 머신, 손목 시큰/)).toBeInTheDocument()
  })
})
