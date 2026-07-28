import { describe, expect, it } from 'vitest'
import { applyWeightKgToSets, formatElapsed } from './format'
import type { SessionExercise } from '../types/models'

describe('formatElapsed', () => {
  it('formats under an hour as MM:SS', () => {
    expect(formatElapsed(0)).toBe('00:00')
    expect(formatElapsed(65_000)).toBe('01:05')
    expect(formatElapsed(3_599_000)).toBe('59:59')
  })

  it('formats an hour or more as H:MM:SS', () => {
    expect(formatElapsed(3_600_000)).toBe('1:00:00')
    expect(formatElapsed(3_661_000)).toBe('1:01:01')
  })
})

describe('applyWeightKgToSets', () => {
  const item: SessionExercise = {
    exerciseId: 'x',
    order: 0,
    sets: [
      { setNumber: 1, weightKg: 20, reps: 10, completed: true },
      { setNumber: 2, weightKg: 0, reps: 0, completed: false },
      { setNumber: 3, weightKg: 0, reps: 0, completed: false },
    ],
  }

  it('applies kg to all sets', () => {
    const next = applyWeightKgToSets(item, 40)
    expect(next.sets.map((s) => s.weightKg)).toEqual([40, 40, 40])
  })

  it('can skip completed sets', () => {
    const next = applyWeightKgToSets(item, 40, { onlyIncomplete: true })
    expect(next.sets.map((s) => s.weightKg)).toEqual([20, 40, 40])
  })
})
