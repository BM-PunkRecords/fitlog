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

/**
 * 세션에 기록된 운동 시간의 합(초).
 *
 * 세트에 적힌 시간만 더한다 — 세션 전체 경과 시간(`startedAt`~`endedAt`)에는
 * 준비·휴식·딴짓이 섞여 있어 "얼마나 움직였나"와는 다른 값이다. 둘 다 쓸모가
 * 있어 따로 둔다.
 */
export function sessionDurationSec(session: Session): number {
  return session.items.reduce(
    (sum, item) =>
      sum + item.sets.reduce((n, s) => n + (s.completed ? (s.durationSec ?? 0) : 0), 0),
    0,
  )
}

/** 완료한 세트 수. 시간·횟수·중량 어떤 종류든 "몇 세트 했나"는 공통이다. */
export function sessionCompletedSets(session: Session): number {
  return session.items.reduce(
    (sum, item) => sum + item.sets.filter((s) => s.completed).length,
    0,
  )
}

/** 세션이 실제로 걸린 시간(초). 진행 중이면 0. */
export function sessionElapsedSec(session: Session): number {
  if (!session.endedAt) return 0
  const ms = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
  return Math.max(0, Math.round(ms / 1000))
}
