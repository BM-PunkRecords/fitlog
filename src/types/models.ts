export type SessionStatus = 'in_progress' | 'completed' | 'discarded'

/**
 * How a session exercise is logged. Absence of the field on a persisted
 * `SessionExercise` is treated exactly as `'weight_reps'` for backward
 * compatibility — see `metricTypeOf` in `lib/metrics`.
 */
export type MetricType = 'weight_reps' | 'duration_distance' | 'duration' | 'reps'

export interface SessionSet {
  setNumber: number
  weightKg: number
  reps: number
  completed: boolean
  /** Elapsed time for time-based metrics, in seconds. */
  durationSec?: number
  /** Distance for distance-based metrics, in kilometres. */
  distanceKm?: number
}

export interface SessionExercise {
  exerciseId: string
  order: number
  sets: SessionSet[]
  restSecondsDefault?: number
  /** Optional; missing means legacy `'weight_reps'`. */
  metricType?: MetricType
}

export interface Session {
  id: string
  routineId: string | null
  startedAt: string
  endedAt?: string
  status: SessionStatus
  items: SessionExercise[]
}

export interface Routine {
  id: string
  name: string
  exerciseIds: string[]
  /**
   * Optional per-exercise rest overrides, keyed by exercise id (seconds).
   * Absence of an entry (or the whole field, for legacy routines) means the
   * exercise uses the app-wide `AppSettings.defaultRestSeconds`.
   */
  restByExerciseId?: Record<string, number>
  createdAt: string
  updatedAt: string
  lastPerformedAt?: string
}

export interface AppSettings {
  defaultRestSeconds: number
  weightUnit: 'kg'
  /** Favorited catalog / custom exercise ids */
  favoriteExerciseIds: string[]
}

/** User-defined exercise stored in IndexedDB */
export interface CustomExercise {
  id: string
  name: string
  bodyPart: string
  target: string
  equipment: string
  createdAt: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultRestSeconds: Number(import.meta.env.VITE_DEFAULT_REST_SECONDS) || 90,
  weightUnit: 'kg',
  favoriteExerciseIds: [],
}

export const APP_NAME = String(import.meta.env.VITE_APP_NAME || 'FitLog')

