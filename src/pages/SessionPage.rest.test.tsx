import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { LocalWorkoutStore } from '../store/LocalWorkoutStore'
import type { Session } from '../types/models'

const AD_SCRIPT_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7426857657290789'

const SESSION_ID = 'sess-rest-1'
const BENCH = '0025' // Barbell Bench Press
const OTHER = '0489' // 45 Degree Hyperextension

function sets() {
  return [
    { setNumber: 1, weightKg: 0, reps: 0, completed: false },
    { setNumber: 2, weightKg: 0, reps: 0, completed: false },
    { setNumber: 3, weightKg: 0, reps: 0, completed: false },
  ]
}

function seedSession(): Session {
  return {
    id: SESSION_ID,
    routineId: null,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    items: [
      { exerciseId: BENCH, order: 0, sets: sets(), restSecondsDefault: 120 },
      { exerciseId: OTHER, order: 1, sets: sets(), restSecondsDefault: 120 },
    ],
  }
}

beforeEach(async () => {
  indexedDB = new IDBFactory()
  const seedStore = new LocalWorkoutStore()
  const current = await seedStore.getSettings()
  // App default rest was changed 90 -> 120 in Settings.
  await seedStore.saveSettings({ ...current, defaultRestSeconds: 120 })
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
  vi.restoreAllMocks()
})

describe('SessionPage per-exercise rest preset', () => {
  it('applies the clicked preset to the current session exercise only', async () => {
    const saveSpy = vi.spyOn(LocalWorkoutStore.prototype, 'saveSession')
    const user = userEvent.setup()
    render(<App />)

    // Wait for the in-progress session to load and render its rest control.
    const group = await screen.findByRole('group', { name: '이 운동 휴식 시간 프리셋' })
    const restField = group.closest('.rest-field') as HTMLElement
    const value = restField.querySelector('.rest-field-value') as HTMLElement

    const preset90 = within(group).getByRole('button', { name: '1분 30초' })
    const preset120 = within(group).getByRole('button', { name: '2분' })

    // Initial state: the copied effective rest is 120s (2분).
    expect(value).toHaveTextContent('2분')
    expect(preset120).toHaveAttribute('aria-pressed', 'true')
    expect(preset90).toHaveAttribute('aria-pressed', 'false')

    saveSpy.mockClear()
    await user.click(preset90)

    // Visible value + aria-pressed reflect the new selection.
    await waitFor(() => expect(value).toHaveTextContent('1분 30초'))
    expect(preset90).toHaveAttribute('aria-pressed', 'true')
    expect(preset120).toHaveAttribute('aria-pressed', 'false')

    // saveSession got exactly the current item changed to 90s; the other
    // exercise and app default are untouched.
    await waitFor(() => expect(saveSpy).toHaveBeenCalled())
    const saved = saveSpy.mock.calls.at(-1)?.[0] as Session
    expect(saved.id).toBe(SESSION_ID)
    expect(saved.items).toHaveLength(2)
    expect(saved.items[0].restSecondsDefault).toBe(90)
    expect(saved.items[0].exerciseId).toBe(BENCH)
    expect(saved.items[1].restSecondsDefault).toBe(120)
    expect(saved.items[1].exerciseId).toBe(OTHER)

    const settings = await new LocalWorkoutStore().getSettings()
    expect(settings.defaultRestSeconds).toBe(120)

    // Persisted value survives a fresh reload from IndexedDB.
    const reloaded = await new LocalWorkoutStore().getSession(SESSION_ID)
    expect(reloaded?.items[0].restSecondsDefault).toBe(90)
    expect(reloaded?.items[1].restSecondsDefault).toBe(120)
  })

  it('shows the pinned rest countdown when a set is completed', async () => {
    // Seed the first exercise with a pre-filled set so ticking it completes.
    const store = new LocalWorkoutStore()
    const seeded = seedSession()
    seeded.items[0].sets = [
      { setNumber: 1, weightKg: 60, reps: 10, completed: false },
      { setNumber: 2, weightKg: 60, reps: 10, completed: false },
    ]
    await store.saveSession(seeded)

    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: '운동 대체' })

    // No rest bar until a set is actually completed.
    expect(screen.queryByText('휴식')).toBeNull()

    await user.click(screen.getByRole('button', { name: '세트 1 완료' }))

    // The countdown docks at the bottom, seeded with this exercise's rest (120s).
    const bar = (await screen.findByText('휴식')).closest('.rest-bar') as HTMLElement
    expect(bar).not.toBeNull()
    expect(within(bar).getByText('120')).toBeInTheDocument()
  })
})
