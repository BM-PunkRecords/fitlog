import type { MetricType, SessionExercise, SessionSet } from '../types/models'

/** Metric types in display order for selectors. */
export const METRIC_TYPES: MetricType[] = [
  'weight_reps',
  'duration_distance',
  'duration',
  'reps',
]

/** Korean-facing labels for each metric type. */
export const METRIC_LABELS: Record<MetricType, string> = {
  weight_reps: '중량 · 횟수',
  duration_distance: '시간 · 거리',
  duration: '시간',
  reps: '횟수',
}

/**
 * Resolve a session exercise's metric type. Legacy items without the field
 * behave exactly like `'weight_reps'`, so historical data stays readable and
 * no destructive migration is needed.
 */
export function metricTypeOf(item: Pick<SessionExercise, 'metricType'>): MetricType {
  return item.metricType ?? 'weight_reps'
}

/** Which typed set fields a metric type actually uses. */
export function metricFields(type: MetricType): {
  weight: boolean
  reps: boolean
  duration: boolean
  distance: boolean
} {
  switch (type) {
    case 'weight_reps':
      return { weight: true, reps: true, duration: false, distance: false }
    case 'duration_distance':
      return { weight: false, reps: false, duration: true, distance: true }
    case 'duration':
      return { weight: false, reps: false, duration: true, distance: false }
    case 'reps':
      return { weight: false, reps: true, duration: false, distance: false }
  }
}

/** Seconds → `m:ss` (e.g. 1230 → `20:30`). */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Parse a user-typed duration into seconds.
 * - `mm:ss` (or `m:ss`) → minutes and seconds
 * - a bare number → minutes (so `20` means 20:00, matching cardio machines)
 */
export function parseDuration(input: string): number {
  const t = input.trim()
  if (!t) return 0
  if (t.includes(':')) {
    const [mRaw, sRaw = ''] = t.split(':')
    const m = Math.max(0, Math.floor(Number(mRaw) || 0))
    const s = Math.max(0, Math.floor(Number(sRaw) || 0))
    return m * 60 + s
  }
  const minutes = Number(t)
  return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes * 60) : 0
}

/** Whether a completed set is valid to mark done for the given metric type. */
export function isSetComplete(set: SessionSet, type: MetricType): boolean {
  switch (type) {
    case 'weight_reps':
      return set.weightKg > 0 && set.reps > 0
    case 'duration_distance':
    case 'duration':
      return (set.durationSec ?? 0) > 0
    case 'reps':
      return set.reps > 0
  }
}

/** Korean validation hint shown when a set cannot be completed yet. */
export function completeHint(type: MetricType): string {
  switch (type) {
    case 'weight_reps':
      return '완료하려면 중량(kg)과 횟수를 0보다 크게 입력하세요'
    case 'duration_distance':
    case 'duration':
      return '완료하려면 시간을 0보다 크게 입력하세요'
    case 'reps':
      return '완료하려면 횟수를 0보다 크게 입력하세요'
  }
}

/** Human-readable one-line summary of a set for the given metric type. */
export function formatMetricSet(set: SessionSet, type: MetricType): string {
  switch (type) {
    case 'weight_reps': {
      const weight = set.weightKg > 0 ? `${set.weightKg} kg` : '맨몸'
      return `${weight} × ${set.reps}회`
    }
    case 'duration_distance': {
      const time = formatDuration(set.durationSec ?? 0)
      const km = set.distanceKm && set.distanceKm > 0 ? `${set.distanceKm} km` : '—'
      return `${time} · ${km}`
    }
    case 'duration':
      return formatDuration(set.durationSec ?? 0)
    case 'reps':
      return `${set.reps}회`
  }
}
