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
  defaultRestSeconds: 90,
  weightUnit: 'kg',
}
