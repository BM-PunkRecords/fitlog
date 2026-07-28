import { describe, it, expect } from 'vitest'
import {
  sessionVolume,
  exerciseVolume,
  exerciseRepsEntered,
  exerciseVolumeEntered,
} from './volume'
import type { Session, SessionExercise } from '../types/models'

const item = (
  sets: { weightKg: number; reps: number; completed: boolean }[],
): SessionExercise => ({
  exerciseId: 'e1',
  order: 0,
  sets: sets.map((s, i) => ({ setNumber: i + 1, ...s })),
})

describe('sessionVolume', () => {
  it('sums weight*reps for completed sets only', () => {
    const session: Session = {
      id: 's1',
      routineId: null,
      startedAt: '2026-07-28T00:00:00.000Z',
      status: 'in_progress',
      items: [
        item([
          { weightKg: 50, reps: 10, completed: true },
          { weightKg: 50, reps: 8, completed: false },
        ]),
      ],
    }
    expect(sessionVolume(session)).toBe(500)
    expect(exerciseVolume(session.items[0])).toBe(500)
  })
})

describe('entered totals', () => {
  it('sums reps and volume from entered fields', () => {
    const ex = item([
      { weightKg: 50, reps: 10, completed: true },
      { weightKg: 40, reps: 8, completed: false },
    ])
    expect(exerciseRepsEntered(ex)).toBe(18)
    expect(exerciseVolumeEntered(ex)).toBe(500 + 320)
  })
})
