import { describe, expect, it } from 'vitest'
import type { Exercise } from './types'
import { buildExerciseIndex, dedupeCatalog } from './dedupe'
import { loadCatalog, loadCatalogWithAliases } from './loadCatalog'
import { tKo } from '../lib/tKo'

function make(id: string, name: string, over: Partial<Exercise> = {}): Exercise {
  return {
    id,
    name,
    aliases: [],
    bodyPart: 'waist',
    target: 'abs',
    secondaryMuscles: [],
    equipment: 'body weight',
    muscleGroup: 'core',
    difficulty: 'beginner',
    compound: false,
    unilateral: false,
    shortDescription: '',
    instructions: '',
    steps: [],
    formCues: [],
    commonMistakes: [],
    breathing: '',
    videos: {},
    thumbnails: {},
    ...over,
  } as Exercise
}

describe('dedupeCatalog', () => {
  it('keeps one entry when the same name appears twice', () => {
    const { catalog } = dedupeCatalog([
      make('a', 'Sit-Up'),
      make('b', 'Sit-Up'),
      make('c', 'Plank'),
    ])
    expect(catalog).toHaveLength(2)
    expect(catalog.map((e) => e.name).sort()).toEqual(['Plank', 'Sit-Up'])
  })

  // A duplicate with no demo video would render an empty media slot, so the
  // richer entry has to win regardless of order.
  it('keeps the entry that has a demo video', () => {
    const { catalog } = dedupeCatalog([
      make('poor', 'Sit-Up'),
      make('rich', 'Sit-Up', { videos: { male: 'v.mp4' } }),
    ])
    expect(catalog[0].id).toBe('rich')
  })

  it('matches names case- and whitespace-insensitively', () => {
    const { catalog } = dedupeCatalog([make('a', 'Sit-Up'), make('b', '  sit-up ')])
    expect(catalog).toHaveLength(1)
  })

  // Saved routines and history reference the id that disappears; losing it
  // would blank out past workouts.
  it('maps a dropped id onto the surviving one', () => {
    const { aliases } = dedupeCatalog([
      make('gone', 'Sit-Up'),
      make('kept', 'Sit-Up', { videos: { male: 'v.mp4' } }),
    ])
    expect(aliases.get('gone')).toBe('kept')
  })

  it('leaves a clean catalog untouched', () => {
    const input = [make('a', 'Plank'), make('b', 'Squat')]
    const { catalog, aliases } = dedupeCatalog(input)
    expect(catalog).toHaveLength(2)
    expect(aliases.size).toBe(0)
  })
})

describe('buildExerciseIndex', () => {
  it('resolves both current and merged-away ids', () => {
    const kept = make('kept', 'Sit-Up')
    const index = buildExerciseIndex([kept], new Map([['gone', 'kept']]))
    expect(index.get('kept')).toBe(kept)
    expect(index.get('gone')).toBe(kept)
  })

  it('ignores an alias whose target is missing', () => {
    const index = buildExerciseIndex([make('a', 'Plank')], new Map([['x', 'nope']]))
    expect(index.get('x')).toBeUndefined()
  })
})

// Guards the shipped data, not just the algorithm — these are the specific
// duplicates that were showing up side by side in the picker.
describe('bundled catalog', () => {
  const catalog = loadCatalog()

  it('lists no exercise name twice', () => {
    const seen = new Map<string, number>()
    for (const ex of catalog) {
      const key = ex.name.trim().toLowerCase()
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
    expect([...seen.entries()].filter(([, n]) => n > 1)).toEqual([])
  })

  // Two different exercises reading identically in Korean are indistinguishable
  // in the picker, which is what the duplicate cleanup was for.
  it('gives every exercise a distinct Korean name', () => {
    const byKo = new Map<string, string[]>()
    for (const ex of catalog) {
      const ko = tKo(ex.name)
      byKo.set(ko, [...(byKo.get(ko) ?? []), ex.name])
    }
    expect([...byKo.entries()].filter(([, names]) => names.length > 1)).toEqual([])
  })

  it('keeps old ids of the merged duplicates resolvable', () => {
    const { catalog: list, aliases } = loadCatalogWithAliases()
    const index = buildExerciseIndex(list, aliases)
    for (const oldId of [
      'drv-sit-up',
      'drv-45-degree-bycicle-twisting-crunch-1',
      'drv-stretching-bridge-pose-setu-bandhasana-1',
      'drv-cardio-exercises-machine',
    ]) {
      expect(index.get(oldId), `${oldId} 가 해석되지 않음`).toBeDefined()
    }
  })
})
