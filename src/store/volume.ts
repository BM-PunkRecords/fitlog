import type { Session, SessionExercise } from '../types/models'

export function exerciseVolume(item: SessionExercise): number {
  return item.sets
    .filter((s) => s.completed)
    .reduce((n, s) => n + s.weightKg * s.reps, 0)
}

export function sessionVolume(session: Session): number {
  return session.items.reduce((n, item) => n + exerciseVolume(item), 0)
}
