import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppSettings, CustomExercise, Routine, Session } from '../types/models'
import { DEFAULT_SETTINGS } from '../types/models'
import type { WorkoutStore } from './WorkoutStore'

interface FitLogDB extends DBSchema {
  settings: {
    key: string
    value: AppSettings
  }
  routines: {
    key: string
    value: Routine
  }
  sessions: {
    key: string
    value: Session
    indexes: { 'by-status': string; 'by-started': string }
  }
  customExercises: {
    key: string
    value: CustomExercise
  }
}

const DB_NAME = 'fitlog-db'
const DB_VERSION = 3

async function openFitLogDB(): Promise<IDBPDatabase<FitLogDB>> {
  return openDB<FitLogDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Always create missing stores (covers failed/partial upgrades)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings')
      }
      if (!db.objectStoreNames.contains('routines')) {
        db.createObjectStore('routines', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'id' })
        store.createIndex('by-status', 'status')
        store.createIndex('by-started', 'startedAt')
      }
      if (!db.objectStoreNames.contains('customExercises')) {
        db.createObjectStore('customExercises', { keyPath: 'id' })
      }
    },
  })
}

export class LocalWorkoutStore implements WorkoutStore {
  private dbPromise: Promise<IDBPDatabase<FitLogDB>>

  constructor() {
    this.dbPromise = openFitLogDB()
  }

  async getSettings(): Promise<AppSettings> {
    const db = await this.dbPromise
    const saved = await db.get('settings', 'default')
    return { ...DEFAULT_SETTINGS, ...saved, favoriteExerciseIds: saved?.favoriteExerciseIds ?? [] }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.dbPromise
    await db.put('settings', settings, 'default')
  }

  async listRoutines(): Promise<Routine[]> {
    const db = await this.dbPromise
    const all = await db.getAll('routines')
    return all.sort((a, b) => {
      const aTime = a.lastPerformedAt ?? a.updatedAt
      const bTime = b.lastPerformedAt ?? b.updatedAt
      return bTime.localeCompare(aTime)
    })
  }

  async getRoutine(id: string): Promise<Routine | undefined> {
    const db = await this.dbPromise
    return db.get('routines', id)
  }

  async upsertRoutine(routine: Routine): Promise<void> {
    const db = await this.dbPromise
    await db.put('routines', routine)
  }

  async deleteRoutine(id: string): Promise<void> {
    const db = await this.dbPromise
    await db.delete('routines', id)
  }

  async getInProgressSession(): Promise<Session | undefined> {
    const db = await this.dbPromise
    const sessions = await db.getAllFromIndex('sessions', 'by-status', 'in_progress')
    return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  }

  async getSession(id: string): Promise<Session | undefined> {
    const db = await this.dbPromise
    return db.get('sessions', id)
  }

  async listSessions(opts?: { status?: Session['status'] }): Promise<Session[]> {
    const db = await this.dbPromise
    const all = opts?.status
      ? await db.getAllFromIndex('sessions', 'by-status', opts.status)
      : await db.getAll('sessions')
    return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }

  async saveSession(session: Session): Promise<void> {
    const db = await this.dbPromise
    await db.put('sessions', session)
  }

  async completeSession(sessionId: string): Promise<Session> {
    const db = await this.dbPromise
    const session = await db.get('sessions', sessionId)
    if (!session) throw new Error('Session not found')
    const endedAt = new Date().toISOString()
    const completed: Session = {
      ...session,
      status: 'completed',
      endedAt,
    }
    await db.put('sessions', completed)
    if (session.routineId) {
      const routine = await db.get('routines', session.routineId)
      if (routine) {
        await db.put('routines', {
          ...routine,
          lastPerformedAt: endedAt,
          updatedAt: endedAt,
        })
      }
    }
    return completed
  }

  async discardSession(sessionId: string): Promise<Session> {
    const db = await this.dbPromise
    const session = await db.get('sessions', sessionId)
    if (!session) throw new Error('Session not found')
    const discarded: Session = {
      ...session,
      status: 'discarded',
      endedAt: new Date().toISOString(),
    }
    await db.put('sessions', discarded)
    return discarded
  }

  async listCustomExercises(): Promise<CustomExercise[]> {
    const db = await this.dbPromise
    if (!db.objectStoreNames.contains('customExercises')) return []
    const all = await db.getAll('customExercises')
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async upsertCustomExercise(exercise: CustomExercise): Promise<void> {
    const db = await this.dbPromise
    if (!db.objectStoreNames.contains('customExercises')) {
      throw new Error('customExercises store missing — reload the app')
    }
    await db.put('customExercises', exercise)
  }

  async deleteCustomExercise(id: string): Promise<void> {
    const db = await this.dbPromise
    if (!db.objectStoreNames.contains('customExercises')) return
    await db.delete('customExercises', id)
  }
}
