import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
