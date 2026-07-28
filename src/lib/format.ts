import type { Exercise } from '../catalog/types'
import type { SessionExercise, SessionSet } from '../types/models'
import { targetKo } from './labelsKo'

export function emptySets(count = 3): SessionSet[] {
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    weightKg: 0,
    reps: 0,
    completed: false,
  }))
}

export function sessionItemFromExercise(
  exerciseId: string,
  order: number,
  restSecondsDefault?: number,
): SessionExercise {
  return {
    exerciseId,
    order,
    sets: emptySets(3),
    restSecondsDefault,
  }
}

export function relativeTime(iso?: string): string {
  if (!iso) return '아직 없음'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

export function routineTargets(
  exerciseIds: string[],
  byId: Map<string, Exercise>,
): string {
  const targets = [
    ...new Set(
      exerciseIds
        .map((id) => byId.get(id)?.target)
        .filter((t): t is string => Boolean(t))
        .map((t) => targetKo(t)),
    ),
  ]
  return targets.slice(0, 3).join(', ') || '운동 구성'
}

export function formatDateKey(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}
