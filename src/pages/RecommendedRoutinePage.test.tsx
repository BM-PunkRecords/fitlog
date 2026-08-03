import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { buildExerciseIndex } from '../catalog/dedupe'
import { loadCatalogWithAliases } from '../catalog/loadCatalog'
import { RECOMMENDED_ROUTINES } from '../data/recommendedRoutines'
import { LocalWorkoutStore } from '../store/LocalWorkoutStore'

const AD_SCRIPT_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7426857657290789'

const routine = RECOMMENDED_ROUTINES[0]

beforeEach(() => {
  indexedDB = new IDBFactory()
  window.history.pushState({}, '', `/recommended/${routine.id}`)
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

describe('recommended routine data', () => {
  // A routine pointing at an exercise the catalog lost would render a blank
  // row with a raw id in it.
  it('references only exercises the catalog can resolve', () => {
    const { catalog, aliases } = loadCatalogWithAliases()
    const index = buildExerciseIndex(catalog, aliases)
    for (const r of RECOMMENDED_ROUTINES) {
      for (const item of r.items) {
        expect(index.get(item.exerciseId), `${r.id} / ${item.exerciseId}`).toBeDefined()
      }
    }
  })

  it('gives every item a target', () => {
    for (const r of RECOMMENDED_ROUTINES) {
      for (const item of r.items) {
        expect(item.reps ?? item.durationSec, `${r.id} / ${item.exerciseId}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('RecommendedRoutinePage', () => {
  it('lists each exercise with its target', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: routine.name })).toBeInTheDocument()
    expect(screen.getByText('12회')).toBeInTheDocument()
    expect(screen.getByText('50회')).toBeInTheDocument()
    // The wall sit is timed rather than counted.
    expect(screen.getByText('1:00')).toBeInTheDocument()
  })

  it('credits where the routine came from', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: routine.name })
    expect(screen.getByText(/@just_pullups/)).toBeInTheDocument()
  })

  // Starting should leave the targets already filled in — retyping "50" for
  // jumping jacks is exactly the work the routine is meant to save.
  it('starts a session with the targets prefilled', async () => {
    const saveSpy = vi.spyOn(LocalWorkoutStore.prototype, 'saveSession')
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '루틴 시작' }))

    await waitFor(() => expect(saveSpy).toHaveBeenCalled())
    const saved = saveSpy.mock.calls.at(-1)?.[0]
    expect(saved?.status).toBe('in_progress')
    expect(saved?.items).toHaveLength(routine.items.length)
    expect(saved?.items[0].sets[0].reps).toBe(routine.items[0].reps)
    // Nothing is ticked off before it has been done.
    expect(saved?.items.every((i) => i.sets.every((s) => !s.completed))).toBe(true)

    const timed = saved?.items.at(-1)
    expect(timed?.metricType).toBe('duration')
    expect(timed?.sets[0].durationSec).toBe(60)
  })
})
