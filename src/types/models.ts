export type SessionStatus = 'in_progress' | 'completed' | 'discarded'

export interface SessionSet {
  setNumber: number
  weightKg: number
  reps: number
  completed: boolean
}

export interface SessionExercise {
  exerciseId: string
  order: number
  sets: SessionSet[]
  restSecondsDefault?: number
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
  createdAt: string
  updatedAt: string
  lastPerformedAt?: string
}

export interface AppSettings {
  defaultRestSeconds: number
  weightUnit: 'kg'
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultRestSeconds: Number(import.meta.env.VITE_DEFAULT_REST_SECONDS) || 90,
  weightUnit: 'kg',
}

export const APP_NAME = String(import.meta.env.VITE_APP_NAME || 'FitLog')

