import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { LocalWorkoutStore } from './LocalWorkoutStore'
import { createId } from './createId'
import { metricTypeOf } from '../lib/metrics'
import { DEFAULT_SETTINGS, type Routine, type Session } from '../types/models'

describe('LocalWorkoutStore', () => {
  let store: LocalWorkoutStore

  beforeEach(() => {
    indexedDB = new IDBFactory()
    store = new LocalWorkoutStore()
  })

  it('creates lists updates and deletes routines', async () => {
    const now = new Date().toISOString()
    const routine: Routine = {
      id: createId(),
      name: 'Push',
      exerciseIds: ['1', '2'],
      createdAt: now,
      updatedAt: now,
    }
    await store.upsertRoutine(routine)
    expect((await store.listRoutines()).map((r) => r.id)).toEqual([routine.id])
    await store.upsertRoutine({ ...routine, name: 'Push Day' })
    expect((await store.getRoutine(routine.id))?.name).toBe('Push Day')
    await store.deleteRoutine(routine.id)
    expect(await store.listRoutines()).toEqual([])
  })

  it('returns the default rest time and persists a configured one', async () => {
    const initial = await store.getSettings()
    expect(initial.defaultRestSeconds).toBe(DEFAULT_SETTINGS.defaultRestSeconds)
    await store.saveSettings({ ...initial, defaultRestSeconds: 45 })
    // A fresh store instance re-opens the same IndexedDB, proving persistence.
    const reloaded = await new LocalWorkoutStore().getSettings()
    expect(reloaded.defaultRestSeconds).toBe(45)
    expect(reloaded.weightUnit).toBe('kg')
  })

  it('persists per-exercise routine rest and keeps legacy routines default', async () => {
    const now = new Date().toISOString()
    const withRest: Routine = {
      id: createId(),
      name: 'Legs',
      exerciseIds: ['squat', 'curl'],
      restByExerciseId: { squat: 150 },
      createdAt: now,
      updatedAt: now,
    }
    await store.upsertRoutine(withRest)
    const loaded = await store.getRoutine(withRest.id)
    expect(loaded?.restByExerciseId?.squat).toBe(150)
    expect(loaded?.restByExerciseId?.curl).toBeUndefined()

    const legacy: Routine = {
      id: createId(),
      name: 'Push',
      exerciseIds: ['bench'],
      createdAt: now,
      updatedAt: now,
    }
    await store.upsertRoutine(legacy)
    const loadedLegacy = await store.getRoutine(legacy.id)
    expect(loadedLegacy?.restByExerciseId).toBeUndefined()
  })

  it('saves in-progress session and completes it', async () => {
    const session: Session = {
      id: createId(),
      routineId: null,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      items: [
        {
          exerciseId: 'e1',
          order: 0,
          sets: [{ setNumber: 1, weightKg: 40, reps: 8, completed: true }],
        },
      ],
    }
    await store.saveSession(session)
    expect((await store.getInProgressSession())?.id).toBe(session.id)
    const completed = await store.completeSession(session.id)
    expect(completed.status).toBe('completed')
    expect(await store.getInProgressSession()).toBeUndefined()
    expect((await store.listSessions({ status: 'completed' })).map((s) => s.id)).toEqual([
      session.id,
    ])
  })

  it('persists per-exercise metricType and treats legacy items as weight_reps', async () => {
    const session: Session = {
      id: createId(),
      routineId: null,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      items: [
        {
          exerciseId: 'rower',
          order: 0,
          metricType: 'duration_distance',
          sets: [
            { setNumber: 1, weightKg: 0, reps: 0, durationSec: 1200, distanceKm: 4, completed: true },
          ],
        },
        {
          // legacy item without metricType
          exerciseId: 'bench',
          order: 1,
          sets: [{ setNumber: 1, weightKg: 60, reps: 8, completed: true }],
        },
      ],
    }
    await store.saveSession(session)
    const loaded = await store.getSession(session.id)
    expect(loaded?.items[0].metricType).toBe('duration_distance')
    expect(loaded?.items[0].sets[0].durationSec).toBe(1200)
    expect(loaded?.items[1].metricType).toBeUndefined()
    expect(metricTypeOf(loaded!.items[1])).toBe('weight_reps')
  })

  it('discards session so it is not in completed list', async () => {
    const session: Session = {
      id: createId(),
      routineId: null,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      items: [],
    }
    await store.saveSession(session)
    await store.discardSession(session.id)
    expect(await store.listSessions({ status: 'completed' })).toEqual([])
    expect((await store.getSession(session.id))?.status).toBe('discarded')
  })

  it('stores custom exercises', async () => {
    const row = {
      id: createId(),
      name: '스미스 머신 스쿼트(커스텀)',
      bodyPart: 'upper legs',
      target: 'quads',
      equipment: 'smith machine',
      createdAt: new Date().toISOString(),
    }
    await store.upsertCustomExercise(row)
    expect((await store.listCustomExercises()).map((e) => e.id)).toEqual([row.id])
    await store.deleteCustomExercise(row.id)
    expect(await store.listCustomExercises()).toEqual([])
  })
})
