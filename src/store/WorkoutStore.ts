import type { AppSettings, CustomExercise, Routine, Session } from '../types/models'

export interface WorkoutStore {
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>
  listRoutines(): Promise<Routine[]>
  getRoutine(id: string): Promise<Routine | undefined>
  upsertRoutine(routine: Routine): Promise<void>
  deleteRoutine(id: string): Promise<void>
  getInProgressSession(): Promise<Session | undefined>
  getSession(id: string): Promise<Session | undefined>
  listSessions(opts?: { status?: Session['status'] }): Promise<Session[]>
  saveSession(session: Session): Promise<void>
  completeSession(sessionId: string): Promise<Session>
  discardSession(sessionId: string): Promise<Session>
  listCustomExercises(): Promise<CustomExercise[]>
  upsertCustomExercise(exercise: CustomExercise): Promise<void>
  deleteCustomExercise(id: string): Promise<void>
}
