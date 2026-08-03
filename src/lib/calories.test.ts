import { describe, expect, it } from 'vitest'
import { activeSecondsFor, estimateMet, estimateSessionCalories } from './calories'
import type { Session, SessionExercise } from '../types/models'

function session(items: SessionExercise[]): Session {
  return {
    id: 's',
    routineId: null,
    startedAt: '2026-08-03T10:00:00.000Z',
    endedAt: '2026-08-03T10:30:00.000Z',
    status: 'completed',
    items,
  }
}

describe('estimateMet', () => {
  it('rates cardio highest among the everyday cases', () => {
    expect(estimateMet({ bodyPart: 'cardio' })).toBeGreaterThan(estimateMet({ compound: true }))
    expect(estimateMet({ target: 'cardiovascular system' })).toBe(7)
  })

  // Bodyweight circuit work has no rack to rest against between reps.
  it('rates bodyweight compound work above isolation', () => {
    const circuit = estimateMet({ equipment: 'body weight', compound: true })
    const isolation = estimateMet({ equipment: 'dumbbell', compound: false })
    expect(circuit).toBeGreaterThan(isolation)
  })

  it('rates compound lifts above isolation lifts', () => {
    expect(estimateMet({ equipment: 'barbell', compound: true })).toBeGreaterThan(
      estimateMet({ equipment: 'barbell', compound: false }),
    )
  })

  it('falls back to a light-lifting value when nothing is known', () => {
    expect(estimateMet(undefined)).toBe(3.5)
    expect(estimateMet({})).toBe(3.5)
  })
})

describe('activeSecondsFor', () => {
  it('adds recorded seconds for timed work', () => {
    const item: SessionExercise = {
      exerciseId: 'a',
      order: 0,
      metricType: 'duration',
      sets: [
        { setNumber: 1, weightKg: 0, reps: 0, durationSec: 60, completed: true },
        { setNumber: 2, weightKg: 0, reps: 0, durationSec: 30, completed: true },
      ],
    }
    expect(activeSecondsFor(item)).toBe(90)
  })

  // Strength sets record load and reps but never a clock, so time has to be
  // assumed — otherwise every lifting session would estimate zero calories.
  it('assumes a per-set duration for strength work', () => {
    const item: SessionExercise = {
      exerciseId: 'a',
      order: 0,
      sets: [
        { setNumber: 1, weightKg: 60, reps: 10, completed: true },
        { setNumber: 2, weightKg: 60, reps: 10, completed: true },
      ],
    }
    expect(activeSecondsFor(item)).toBeGreaterThan(0)
  })

  it('counts only completed sets', () => {
    const item: SessionExercise = {
      exerciseId: 'a',
      order: 0,
      metricType: 'duration',
      sets: [
        { setNumber: 1, weightKg: 0, reps: 0, durationSec: 60, completed: true },
        { setNumber: 2, weightKg: 0, reps: 0, durationSec: 60, completed: false },
      ],
    }
    expect(activeSecondsFor(item)).toBe(60)
  })
})

describe('estimateSessionCalories', () => {
  const timed: SessionExercise = {
    exerciseId: 'a',
    order: 0,
    metricType: 'duration',
    sets: [{ setNumber: 1, weightKg: 0, reps: 0, durationSec: 3600, completed: true }],
  }

  // Inventing a default bodyweight would turn an estimate into fiction.
  it('returns null without a bodyweight', () => {
    expect(estimateSessionCalories(session([timed]), undefined, () => ({}))).toBeNull()
    expect(estimateSessionCalories(session([timed]), 0, () => ({}))).toBeNull()
  })

  it('applies MET x weight x hours', () => {
    // 7 MET, 70 kg, 1 h = 490 kcal
    const kcal = estimateSessionCalories(session([timed]), 70, () => ({ bodyPart: 'cardio' }))
    expect(kcal).toBe(490)
  })

  it('scales with bodyweight', () => {
    const light = estimateSessionCalories(session([timed]), 50, () => ({ bodyPart: 'cardio' }))
    const heavy = estimateSessionCalories(session([timed]), 100, () => ({ bodyPart: 'cardio' }))
    expect(heavy).toBeGreaterThan(light!)
  })

  it('adds every exercise in the session', () => {
    const one = estimateSessionCalories(session([timed]), 70, () => ({ bodyPart: 'cardio' }))
    const two = estimateSessionCalories(
      session([timed, { ...timed, order: 1 }]),
      70,
      () => ({ bodyPart: 'cardio' }),
    )
    expect(two).toBe(one! * 2)
  })

  it('is zero for a session with nothing completed', () => {
    const none: SessionExercise = {
      ...timed,
      sets: [{ setNumber: 1, weightKg: 0, reps: 0, durationSec: 3600, completed: false }],
    }
    expect(estimateSessionCalories(session([none]), 70, () => ({}))).toBe(0)
  })
})
