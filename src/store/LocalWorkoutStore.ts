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
const OPEN_TIMEOUT_MS = 4000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

async function openFitLogDB(): Promise<IDBPDatabase<FitLogDB>> {
  const openPromise = openDB<FitLogDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
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
    blocked() {
      console.warn('FitLog IndexedDB open blocked by another tab')
    },
    blocking() {
      // Allow upgrades to proceed when this connection is blocking
      console.warn('FitLog IndexedDB connection is blocking an upgrade')
    },
  })

  return withTimeout(openPromise, OPEN_TIMEOUT_MS, 'IndexedDB open')
}

/** In-memory fallback when IndexedDB is unavailable / hung */
class MemoryWorkoutStore implements WorkoutStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS, favoriteExerciseIds: [] }
  private routines = new Map<string, Routine>()
  private sessions = new Map<string, Session>()
  private customs = new Map<string, CustomExercise>()

  async getSettings() {
    return { ...this.settings, favoriteExerciseIds: [...(this.settings.favoriteExerciseIds ?? [])] }
  }
  async saveSettings(settings: AppSettings) {
    this.settings = { ...settings, favoriteExerciseIds: [...(settings.favoriteExerciseIds ?? [])] }
  }
  async listRoutines() {
    return [...this.routines.values()].sort((a, b) =>
      (b.lastPerformedAt ?? b.updatedAt).localeCompare(a.lastPerformedAt ?? a.updatedAt),
    )
  }
  async getRoutine(id: string) {
    return this.routines.get(id)
  }
  async upsertRoutine(routine: Routine) {
    this.routines.set(routine.id, routine)
  }
  async deleteRoutine(id: string) {
    this.routines.delete(id)
  }
  async getInProgressSession() {
    return [...this.sessions.values()]
      .filter((s) => s.status === 'in_progress')
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  }
  async getSession(id: string) {
    return this.sessions.get(id)
  }
  async listSessions(opts?: { status?: Session['status'] }) {
    let all = [...this.sessions.values()]
    if (opts?.status) all = all.filter((s) => s.status === opts.status)
    return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }
  async saveSession(session: Session) {
    this.sessions.set(session.id, session)
  }
  async completeSession(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')
    const endedAt = new Date().toISOString()
    const completed: Session = { ...session, status: 'completed', endedAt }
    this.sessions.set(sessionId, completed)
    if (session.routineId) {
      const routine = this.routines.get(session.routineId)
      if (routine) {
        this.routines.set(session.routineId, {
          ...routine,
          lastPerformedAt: endedAt,
          updatedAt: endedAt,
        })
      }
    }
    return completed
  }
  async discardSession(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('Session not found')
    const discarded: Session = {
      ...session,
      status: 'discarded',
      endedAt: new Date().toISOString(),
    }
    this.sessions.set(sessionId, discarded)
    return discarded
  }
  async listCustomExercises() {
    return [...this.customs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  async upsertCustomExercise(exercise: CustomExercise) {
    this.customs.set(exercise.id, exercise)
  }
  async deleteCustomExercise(id: string) {
    this.customs.delete(id)
  }
}

export class LocalWorkoutStore implements WorkoutStore {
  private dbPromise: Promise<IDBPDatabase<FitLogDB> | null>
  private memory = new MemoryWorkoutStore()
  private useMemory = false

  constructor() {
    this.dbPromise = openFitLogDB()
      .then((db) => {
        this.useMemory = false
        return db
      })
      .catch((err: unknown) => {
        console.error('FitLog falling back to memory store', err)
        this.useMemory = true
        return null
      })
  }

  private async db(): Promise<IDBPDatabase<FitLogDB> | null> {
    return this.dbPromise
  }

  async getSettings(): Promise<AppSettings> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.getSettings()
    const saved = await db.get('settings', 'default')
    return { ...DEFAULT_SETTINGS, ...saved, favoriteExerciseIds: saved?.favoriteExerciseIds ?? [] }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.saveSettings(settings)
    await db.put('settings', settings, 'default')
  }

  async listRoutines(): Promise<Routine[]> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.listRoutines()
    const all = await db.getAll('routines')
    return all.sort((a, b) => {
      const aTime = a.lastPerformedAt ?? a.updatedAt
      const bTime = b.lastPerformedAt ?? b.updatedAt
      return bTime.localeCompare(aTime)
    })
  }

  async getRoutine(id: string): Promise<Routine | undefined> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.getRoutine(id)
    return db.get('routines', id)
  }

  async upsertRoutine(routine: Routine): Promise<void> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.upsertRoutine(routine)
    await db.put('routines', routine)
  }

  async deleteRoutine(id: string): Promise<void> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.deleteRoutine(id)
    await db.delete('routines', id)
  }

  async getInProgressSession(): Promise<Session | undefined> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.getInProgressSession()
    const sessions = await db.getAllFromIndex('sessions', 'by-status', 'in_progress')
    return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  }

  async getSession(id: string): Promise<Session | undefined> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.getSession(id)
    return db.get('sessions', id)
  }

  async listSessions(opts?: { status?: Session['status'] }): Promise<Session[]> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.listSessions(opts)
    const all = opts?.status
      ? await db.getAllFromIndex('sessions', 'by-status', opts.status)
      : await db.getAll('sessions')
    return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }

  async saveSession(session: Session): Promise<void> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.saveSession(session)
    await db.put('sessions', session)
  }

  async completeSession(sessionId: string): Promise<Session> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.completeSession(sessionId)
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
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.discardSession(sessionId)
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
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.listCustomExercises()
    if (!db.objectStoreNames.contains('customExercises')) return []
    const all = await db.getAll('customExercises')
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async upsertCustomExercise(exercise: CustomExercise): Promise<void> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.upsertCustomExercise(exercise)
    if (!db.objectStoreNames.contains('customExercises')) {
      return this.memory.upsertCustomExercise(exercise)
    }
    await db.put('customExercises', exercise)
  }

  async deleteCustomExercise(id: string): Promise<void> {
    const db = await this.db()
    if (!db || this.useMemory) return this.memory.deleteCustomExercise(id)
    if (!db.objectStoreNames.contains('customExercises')) return
    await db.delete('customExercises', id)
  }
}
