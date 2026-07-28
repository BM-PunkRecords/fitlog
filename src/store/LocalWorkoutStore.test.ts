import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { LocalWorkoutStore } from './LocalWorkoutStore'
import { createId } from './createId'
import type { Routine, Session } from '../types/models'

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
