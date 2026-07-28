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

/** Elapsed workout time: `MM:SS` or `H:MM:SS` */
export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}

/** Apply the same kg to every set (optionally skip completed). */
export function applyWeightKgToSets(
  item: SessionExercise,
  weightKg: number,
  options: { onlyIncomplete?: boolean } = {},
): SessionExercise {
  const kg = Number.isFinite(weightKg) && weightKg >= 0 ? weightKg : 0
  return {
    ...item,
    sets: item.sets.map((set) => {
      if (options.onlyIncomplete && set.completed) return set
      return { ...set, weightKg: kg }
    }),
  }
}
