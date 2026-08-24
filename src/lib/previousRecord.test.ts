import { describe, expect, it } from 'vitest'
import {
  findPreviousRecord,
  isPristineExercise,
  prefillFromPrevious,
  type PreviousRecord,
} from './previousRecord'
import type { MetricType, Session, SessionExercise, SessionSet, SessionStatus } from '../types/models'

const set = (
  setNumber: number,
  weightKg: number,
  reps: number,
  completed = true,
): SessionSet => ({ setNumber, weightKg, reps, completed })

const session = (
  id: string,
  startedAt: string,
  status: SessionStatus,
  items: { exerciseId: string; sets: SessionSet[]; metricType?: MetricType }[],
  endedAt?: string,
): Session => ({
  id,
  routineId: null,
  startedAt,
  endedAt,
  status,
  items: items.map((item, order) => ({ ...item, order })),
})

const current = session('current', '2026-07-29T09:00:00.000Z', 'in_progress', [
  { exerciseId: 'bench', sets: [set(1, 0, 0, false)] },
])

describe('findPreviousRecord', () => {
  it('picks the most recent earlier completed session for the exercise', () => {
    const older = session(
      's-old',
      '2026-07-20T09:00:00.000Z',
      'completed',
      [{ exerciseId: 'bench', sets: [set(1, 50, 10)] }],
      '2026-07-20T10:00:00.000Z',
    )
    const newer = session(
      's-new',
      '2026-07-27T09:00:00.000Z',
      'completed',
      [{ exerciseId: 'bench', sets: [set(1, 60, 8)] }],
      '2026-07-27T10:00:00.000Z',
    )
    const record = findPreviousRecord([older, newer], current, 'bench')
    expect(record?.date).toBe('2026-07-27T10:00:00.000Z')
    expect(record?.sets.map((s) => s.weightKg)).toEqual([60])
  })

  it('defaults legacy items (no metricType) to weight_reps and preserves set metric', () => {
    const legacy = session(
      's-legacy',
      '2026-07-20T09:00:00.000Z',
      'completed',
      [{ exerciseId: 'bench', sets: [set(1, 50, 10)] }],
      '2026-07-20T10:00:00.000Z',
    )
    const rowing = session(
      's-row',
      '2026-07-19T09:00:00.000Z',
      'completed',
      [
        {
          exerciseId: 'rower',
          sets: [{ setNumber: 1, weightKg: 0, reps: 0, durationSec: 1200, distanceKm: 4, completed: true }],
          metricType: 'duration_distance',
        },
      ],
      '2026-07-19T10:00:00.000Z',
    )
    expect(findPreviousRecord([legacy], current, 'bench')?.metricType).toBe('weight_reps')
    expect(findPreviousRecord([rowing], current, 'rower')?.metricType).toBe('duration_distance')
  })

  it('excludes the current, in-progress, discarded, and later sessions', () => {
    const inProgress = session('s-ip', '2026-07-26T09:00:00.000Z', 'in_progress', [
      { exerciseId: 'bench', sets: [set(1, 70, 8)] },
    ])
    const discarded = session('s-disc', '2026-07-25T09:00:00.000Z', 'discarded', [
      { exerciseId: 'bench', sets: [set(1, 80, 8)] },
    ])
    const later = session('s-later', '2026-07-30T09:00:00.000Z', 'completed', [
      { exerciseId: 'bench', sets: [set(1, 90, 8)] },
    ])
    const currentAsCompleted = { ...current, status: 'completed' as const }
    const valid = session(
      's-valid',
      '2026-07-24T09:00:00.000Z',
      'completed',
      [{ exerciseId: 'bench', sets: [set(1, 55, 12)] }],
      '2026-07-24T10:00:00.000Z',
    )
    const record = findPreviousRecord(
      [inProgress, discarded, later, currentAsCompleted, valid],
      current,
      'bench',
    )
    expect(record?.date).toBe('2026-07-24T10:00:00.000Z')
    expect(record?.sets.map((s) => s.weightKg)).toEqual([55])
  })

  it('returns only completed sets and skips sessions without any', () => {
    const noneCompleted = session(
      's-none',
      '2026-07-28T09:00:00.000Z',
      'completed',
      [{ exerciseId: 'bench', sets: [set(1, 40, 5, false), set(2, 40, 5, false)] }],
      '2026-07-28T10:00:00.000Z',
    )
    const mixed = session(
      's-mixed',
      '2026-07-22T09:00:00.000Z',
      'completed',
      [
        {
          exerciseId: 'bench',
          sets: [set(1, 45, 10, true), set(2, 45, 8, false), set(3, 45, 6, true)],
        },
      ],
      '2026-07-22T10:00:00.000Z',
    )
    const record = findPreviousRecord([noneCompleted, mixed], current, 'bench')
    expect(record?.date).toBe('2026-07-22T10:00:00.000Z')
    expect(record?.sets.map((s) => s.setNumber)).toEqual([1, 3])
  })

  it('returns null when no earlier completed record exists', () => {
    const otherExercise = session(
      's-other',
      '2026-07-20T09:00:00.000Z',
      'completed',
      [{ exerciseId: 'squat', sets: [set(1, 100, 5)] }],
      '2026-07-20T10:00:00.000Z',
    )
    expect(findPreviousRecord([otherExercise], current, 'bench')).toBeNull()
    expect(findPreviousRecord([], current, 'bench')).toBeNull()
  })

  it('carries the previous note so it can be shown again', () => {
    const withNote = session(
      's-note',
      '2026-07-25T09:00:00.000Z',
      'completed',
      [{ exerciseId: 'bench', sets: [set(1, 50, 10)] }],
      '2026-07-25T10:00:00.000Z',
    )
    withNote.items[0].note = '3번 머신, 손목 시큰'
    expect(findPreviousRecord([withNote], current, 'bench')?.note).toBe('3번 머신, 손목 시큰')
  })
})

const item = (sets: SessionSet[]): SessionExercise => ({
  exerciseId: 'bench',
  order: 0,
  sets,
})

describe('isPristineExercise', () => {
  it('is true only when every set is empty and untouched', () => {
    expect(isPristineExercise(item([set(1, 0, 0, false), set(2, 0, 0, false)]))).toBe(true)
    expect(isPristineExercise(item([set(1, 40, 0, false)]))).toBe(false) // weight entered
    expect(isPristineExercise(item([set(1, 0, 8, false)]))).toBe(false) // reps entered
    expect(isPristineExercise(item([set(1, 0, 0, true)]))).toBe(false) // completed
    expect(
      isPristineExercise(
        item([{ setNumber: 1, weightKg: 0, reps: 0, durationSec: 30, completed: false }]),
      ),
    ).toBe(false) // time entered
  })
})

describe('prefillFromPrevious', () => {
  it('copies weight/reps into fresh, uncompleted sets and adopts the metric', () => {
    const record: PreviousRecord = {
      date: '2026-07-25T10:00:00.000Z',
      metricType: 'weight_reps',
      sets: [set(1, 60, 10), set(2, 60, 9), set(3, 55, 8)],
    }
    const filled = prefillFromPrevious(item([set(1, 0, 0, false)]), record)
    expect(filled.sets).toHaveLength(3)
    expect(filled.sets.map((s) => [s.weightKg, s.reps])).toEqual([[60, 10], [60, 9], [55, 8]])
    expect(filled.sets.every((s) => !s.completed)).toBe(true)
    expect(filled.metricType).toBe('weight_reps')
  })

  it('preserves duration/distance fields for time-based records', () => {
    const record: PreviousRecord = {
      date: '2026-07-25T10:00:00.000Z',
      metricType: 'duration_distance',
      sets: [{ setNumber: 1, weightKg: 0, reps: 0, durationSec: 1200, distanceKm: 4, completed: true }],
    }
    const filled = prefillFromPrevious(item([set(1, 0, 0, false)]), record)
    expect(filled.sets[0]).toMatchObject({ durationSec: 1200, distanceKm: 4, completed: false })
    expect(filled.metricType).toBe('duration_distance')
  })
})
