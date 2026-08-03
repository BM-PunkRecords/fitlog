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
  /**
   * 카탈로그에 없는 동작의 표시 이름(챌린지 동작 등).
   *
   * 기록은 "그때 무엇을 했는가"라 나중에 카탈로그나 챌린지 구성이 바뀌어도
   * 그대로 남아야 한다. 그래서 이름을 참조로 두지 않고 기록 시점에 박아 둔다.
   * 카탈로그에 있는 운동이면 비워 두고 카탈로그 이름을 쓴다.
   */
  displayName?: string
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

