import type { Routine } from '../types/models'

/** Quick-pick rest durations in seconds. */
export const REST_PRESETS = [30, 60, 90, 120, 180] as const

const MIN_REST = 0
const MAX_REST = 3600

/** Clamp a rest duration to a practical whole-second range `[0, 3600]`. */
export function clampRest(seconds: number): number {
  if (!Number.isFinite(seconds)) return MIN_REST
  return Math.min(MAX_REST, Math.max(MIN_REST, Math.round(seconds)))
}

/**
 * Effective rest for a session exercise: its own `restSecondsDefault` when set,
 * otherwise the app-wide default. Legacy items without the field fall back
 * cleanly, so no data migration is needed. An explicit `0` means "no rest" and
 * is preserved (only `undefined` falls back to the default).
 */
export function resolveRest(
  restSecondsDefault: number | undefined,
  defaultRestSeconds: number,
): number {
  return restSecondsDefault ?? defaultRestSeconds
}

/**
 * Effective rest for one routine exercise: the routine's per-exercise override
 * when present, otherwise the app-wide default. Legacy routines without
 * `restByExerciseId` always resolve to the default.
 */
export function routineRestFor(
  routine: Pick<Routine, 'restByExerciseId'>,
  exerciseId: string,
  defaultRestSeconds: number,
): number {
  return routine.restByExerciseId?.[exerciseId] ?? defaultRestSeconds
}

/** Whether a routine has an explicit per-exercise rest override. */
export function hasRoutineRestOverride(
  routine: Pick<Routine, 'restByExerciseId'>,
  exerciseId: string,
): boolean {
  return routine.restByExerciseId?.[exerciseId] !== undefined
}

/** Compact Korean rest label: `45초`, `2분`, `1분 30초`. */
export function formatRest(seconds: number): string {
  const total = clampRest(seconds)
  if (total < 60) return `${total}초`
  const m = Math.floor(total / 60)
  const s = total % 60
  return s === 0 ? `${m}분` : `${m}분 ${s}초`
}
