import type { Session, SessionExercise } from '../types/models'

export function exerciseVolume(item: SessionExercise): number {
  return item.sets
    .filter((s) => s.completed)
    .reduce((n, s) => n + s.weightKg * s.reps, 0)
}

export function sessionVolume(session: Session): number {
  return session.items.reduce((n, item) => n + exerciseVolume(item), 0)
}

/** Live totals from entered fields (completed or not). */
export function exerciseRepsEntered(item: SessionExercise): number {
  return item.sets.reduce((n, s) => n + (s.reps > 0 ? s.reps : 0), 0)
}

export function exerciseVolumeEntered(item: SessionExercise): number {
  return item.sets.reduce((n, s) => {
    if (s.weightKg <= 0 || s.reps <= 0) return n
    return n + s.weightKg * s.reps
  }, 0)
}

export function sessionRepsEntered(session: Session): number {
  return session.items.reduce((n, item) => n + exerciseRepsEntered(item), 0)
}
