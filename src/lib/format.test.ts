import { describe, expect, it } from 'vitest'
import { applyRowEdit,
  buildRoutineSessionItems,
  formatElapsed,
  setSessionExerciseRest, sessionItemName, appendSet, isExerciseComplete } from './format'
import type { Session, SessionExercise, SessionSet } from '../types/models'

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

describe('applyRowEdit', () => {
  const weightItem: SessionExercise = {
    exerciseId: 'x',
    order: 0,
    metricType: 'weight_reps',
    sets: [
      { setNumber: 1, weightKg: 20, reps: 10, completed: true },
      { setNumber: 2, weightKg: 30, reps: 8, completed: false },
      { setNumber: 3, weightKg: 30, reps: 8, completed: true },
      { setNumber: 4, weightKg: 30, reps: 8, completed: false },
      { setNumber: 5, weightKg: 30, reps: 8, completed: false },
    ],
  }

  it('individual mode changes only the selected row', () => {
    const next = applyRowEdit(weightItem, 2, { weightKg: 40 }, 'individual')
    expect(next.sets.map((s) => s.weightKg)).toEqual([20, 40, 30, 30, 30])
  })

  it('bulk mode changes the selected row and every row below it', () => {
    const next = applyRowEdit(weightItem, 2, { weightKg: 40 }, 'bulk')
    expect(next.sets.map((s) => s.weightKg)).toEqual([20, 40, 40, 40, 40])
  })

  it('leaves rows above the selected row unchanged in bulk mode', () => {
    const next = applyRowEdit(weightItem, 3, { weightKg: 50 }, 'bulk')
    expect(next.sets[0].weightKg).toBe(20)
    expect(next.sets[1].weightKg).toBe(30)
  })

  it('changes only the edited field, not siblings', () => {
    const next = applyRowEdit(weightItem, 2, { weightKg: 40 }, 'bulk')
    expect(next.sets.map((s) => s.reps)).toEqual([10, 8, 8, 8, 8])
  })

  it('preserves completed flags for every affected row', () => {
    const next = applyRowEdit(weightItem, 2, { weightKg: 40 }, 'bulk')
    expect(next.sets.map((s) => s.completed)).toEqual([true, false, true, false, false])
  })

  it('cascades reps for bodyweight/reps metrics', () => {
    const next = applyRowEdit(weightItem, 3, { reps: 12 }, 'bulk')
    expect(next.sets.map((s) => s.reps)).toEqual([10, 8, 12, 12, 12])
  })

  it('cascades duration and distance for cardio metrics', () => {
    const cardioItem: SessionExercise = {
      exerciseId: 'row',
      order: 0,
      metricType: 'duration_distance',
      sets: [
        { setNumber: 1, weightKg: 0, reps: 0, durationSec: 600, distanceKm: 2, completed: true },
        { setNumber: 2, weightKg: 0, reps: 0, durationSec: 0, distanceKm: 0, completed: false },
        { setNumber: 3, weightKg: 0, reps: 0, durationSec: 0, distanceKm: 0, completed: false },
      ],
    }
    const withTime = applyRowEdit(cardioItem, 2, { durationSec: 1200 }, 'bulk')
    expect(withTime.sets.map((s) => s.durationSec)).toEqual([600, 1200, 1200])
    expect(withTime.sets.map((s) => s.distanceKm)).toEqual([2, 0, 0])

    const withDistance = applyRowEdit(cardioItem, 1, { distanceKm: 5 }, 'bulk')
    expect(withDistance.sets.map((s) => s.distanceKm)).toEqual([5, 5, 5])
    expect(withDistance.sets.map((s) => s.durationSec)).toEqual([600, 0, 0])
  })
})

describe('buildRoutineSessionItems', () => {
  it('copies the app default into every item for a legacy routine', () => {
    const items = buildRoutineSessionItems({ exerciseIds: ['a', 'b'] }, 90)
    expect(items.map((i) => i.restSecondsDefault)).toEqual([90, 90])
    expect(items.map((i) => i.order)).toEqual([0, 1])
    expect(items.map((i) => i.exerciseId)).toEqual(['a', 'b'])
  })

  it('copies the per-exercise override where present and the default otherwise', () => {
    const items = buildRoutineSessionItems(
      { exerciseIds: ['a', 'b', 'c'], restByExerciseId: { b: 45 } },
      90,
    )
    expect(items.map((i) => i.restSecondsDefault)).toEqual([90, 45, 90])
  })
})

describe('setSessionExerciseRest', () => {
  const session: Session = {
    id: 's',
    routineId: null,
    startedAt: '2026-07-29T00:00:00.000Z',
    status: 'in_progress',
    items: [
      { exerciseId: 'a', order: 0, restSecondsDefault: 90, sets: [] },
      { exerciseId: 'b', order: 1, restSecondsDefault: 90, sets: [] },
    ],
  }

  it('changes only the targeted exercise rest', () => {
    const next = setSessionExerciseRest(session, 1, 30)
    expect(next.items.map((i) => i.restSecondsDefault)).toEqual([90, 30])
  })

  it('does not mutate the original session', () => {
    setSessionExerciseRest(session, 0, 15)
    expect(session.items[0].restSecondsDefault).toBe(90)
  })
})

describe('sessionItemName', () => {
  const catalog = new Map([['0025', { name: 'Barbell Bench Press' }]])
  const translate = (n: string) => (n === 'Barbell Bench Press' ? '바벨 벤치프레스' : n)

  it('prefers the catalog name', () => {
    const name = sessionItemName({ exerciseId: '0025', displayName: '무시됨' }, catalog, translate)
    expect(name).toBe('바벨 벤치프레스')
  })

  // Challenge moves with no catalog entry used to surface their internal id
  // ("challenge:abs-1min:1") in the history screen.
  it('falls back to the recorded name for items outside the catalog', () => {
    const name = sessionItemName(
      { exerciseId: 'challenge:abs-1min:1', displayName: '플랭크 잭' },
      catalog,
      translate,
    )
    expect(name).toBe('플랭크 잭')
  })

  it('shows the id only when nothing else was recorded', () => {
    expect(sessionItemName({ exerciseId: 'unknown-id' }, catalog, translate)).toBe('unknown-id')
  })
})

describe('appendSet', () => {
  const base = (sets: SessionSet[]): SessionExercise => ({
    exerciseId: 'a',
    order: 0,
    sets,
  })

  // Most people repeat the same load across sets; retyping it every time is
  // pure friction.
  it('copies the previous set values onto the new row', () => {
    const item = appendSet(base([{ setNumber: 1, weightKg: 60, reps: 8, completed: true }]))
    expect(item.sets).toHaveLength(2)
    expect(item.sets[1]).toMatchObject({ setNumber: 2, weightKg: 60, reps: 8 })
  })

  it('never inherits the completed flag', () => {
    const item = appendSet(base([{ setNumber: 1, weightKg: 60, reps: 8, completed: true }]))
    expect(item.sets[1].completed) .toBe(false)
  })

  it('carries timed and distance fields when present', () => {
    const item = appendSet(
      base([
        { setNumber: 1, weightKg: 0, reps: 0, durationSec: 90, distanceKm: 1.5, completed: true },
      ]),
    )
    expect(item.sets[1].durationSec).toBe(90)
    expect(item.sets[1].distanceKm).toBe(1.5)
  })

  it('omits fields the previous set did not have', () => {
    const item = appendSet(base([{ setNumber: 1, weightKg: 60, reps: 8, completed: false }]))
    expect(item.sets[1].durationSec).toBeUndefined()
    expect(item.sets[1].distanceKm).toBeUndefined()
  })

  it('starts from zero when there is no previous set', () => {
    const item = appendSet(base([]))
    expect(item.sets[0]).toMatchObject({ setNumber: 1, weightKg: 0, reps: 0, completed: false })
  })
})

describe('isExerciseComplete', () => {
  const item = (sets: SessionSet[]): SessionExercise => ({ exerciseId: 'a', order: 0, sets })

  it('is true once every set is ticked', () => {
    expect(
      isExerciseComplete(
        item([
          { setNumber: 1, weightKg: 0, reps: 0, completed: true },
          { setNumber: 2, weightKg: 0, reps: 0, completed: true },
        ]),
      ),
    ).toBe(true)
  })

  it('is false while any set remains', () => {
    expect(
      isExerciseComplete(
        item([
          { setNumber: 1, weightKg: 0, reps: 0, completed: true },
          { setNumber: 2, weightKg: 0, reps: 0, completed: false },
        ]),
      ),
    ).toBe(false)
  })

  // An exercise with no sets has not been done — it just has nothing to do.
  it('is false for an exercise with no sets', () => {
    expect(isExerciseComplete(item([]))).toBe(false)
  })
})
