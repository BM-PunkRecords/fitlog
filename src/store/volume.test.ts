import { describe, it, expect } from 'vitest'
import { sessionVolume,
  exerciseVolume,
  exerciseRepsEntered,
  exerciseVolumeEntered, sessionCompletedSets, sessionDurationSec, sessionElapsedSec } from './volume'
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

describe('time and set totals', () => {
  const session = (items: Session['items']): Session => ({
    id: 's',
    routineId: null,
    startedAt: '2026-08-03T10:00:00.000Z',
    endedAt: '2026-08-03T10:02:30.000Z',
    status: 'completed',
    items,
  })

  it('adds the seconds of completed timed sets', () => {
    const s = session([
      {
        exerciseId: 'a',
        order: 0,
        metricType: 'duration',
        sets: [
          { setNumber: 1, weightKg: 0, reps: 0, durationSec: 12, completed: true },
          { setNumber: 2, weightKg: 0, reps: 0, durationSec: 12, completed: true },
        ],
      },
    ])
    expect(sessionDurationSec(s)).toBe(24)
  })

  // An abandoned set was never performed, so it must not inflate the total.
  it('ignores sets that were not completed', () => {
    const s = session([
      {
        exerciseId: 'a',
        order: 0,
        metricType: 'duration',
        sets: [
          { setNumber: 1, weightKg: 0, reps: 0, durationSec: 30, completed: true },
          { setNumber: 2, weightKg: 0, reps: 0, durationSec: 30, completed: false },
        ],
      },
    ])
    expect(sessionDurationSec(s)).toBe(30)
    expect(sessionCompletedSets(s)).toBe(1)
  })

  it('is zero for weight work with no recorded time', () => {
    const s = session([
      {
        exerciseId: 'a',
        order: 0,
        sets: [{ setNumber: 1, weightKg: 60, reps: 10, completed: true }],
      },
    ])
    expect(sessionDurationSec(s)).toBe(0)
    expect(sessionCompletedSets(s)).toBe(1)
  })

  // Wall-clock covers rest and faffing about, so it is deliberately separate
  // from the time actually spent moving.
  it('measures wall-clock separately from time under load', () => {
    const s = session([
      {
        exerciseId: 'a',
        order: 0,
        metricType: 'duration',
        sets: [{ setNumber: 1, weightKg: 0, reps: 0, durationSec: 60, completed: true }],
      },
    ])
    expect(sessionElapsedSec(s)).toBe(150)
    expect(sessionDurationSec(s)).toBe(60)
  })

  it('reports no wall-clock for a session still running', () => {
    const s = { ...session([]), endedAt: undefined, status: 'in_progress' as const }
    expect(sessionElapsedSec(s)).toBe(0)
  })
})
