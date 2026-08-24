import type { MetricType, Session, SessionExercise, SessionSet } from '../types/models'
import { metricTypeOf } from './metrics'

export interface PreviousRecord {
  /** ISO timestamp of the previous session (endedAt when present). */
  date: string
  /** Completed sets from that session, in set order. */
  sets: SessionSet[]
  /** Metric type of that session exercise (legacy items → `weight_reps`). */
  metricType: MetricType
  /** Note left on that exercise last time (machine number, feel, …), if any. */
  note?: string
}

/**
 * Most recent earlier completed session that has a completed set for
 * `exerciseId`. The current session and any in-progress/discarded sessions
 * are excluded. Returns null when no such record exists.
 */
export function findPreviousRecord(
  completedSessions: Session[],
  currentSession: Session,
  exerciseId: string,
): PreviousRecord | null {
  const candidates = completedSessions
    .filter(
      (s) =>
        s.status === 'completed' &&
        s.id !== currentSession.id &&
        s.startedAt < currentSession.startedAt,
    )
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  for (const session of candidates) {
    const item = session.items.find((i) => i.exerciseId === exerciseId)
    if (!item) continue
    const sets = item.sets.filter((set) => set.completed)
    if (sets.length === 0) continue
    return {
      date: session.endedAt ?? session.startedAt,
      sets,
      metricType: metricTypeOf(item),
      note: item.note,
    }
  }
  return null
}

/**
 * 아직 손대지 않은 운동인지 — 모든 세트가 비어 있고 완료 표시도 없는 상태.
 * 추천 루틴처럼 목표를 미리 채워 둔 운동은 pristine이 아니므로 덮어쓰지 않는다.
 */
export function isPristineExercise(item: SessionExercise): boolean {
  return item.sets.every(
    (s) => !s.completed && s.weightKg === 0 && s.reps === 0 && !s.durationSec && !s.distanceKm,
  )
}

/**
 * 이전 기록으로 세트를 미리 채운 운동을 돌려준다(완료로 표시하지는 않는다).
 *
 * 지난번과 같은 무게·횟수를 다시 입력하게 하지 않으려는 것이다 — 그대로 하면
 * 체크만, 다르게 했으면 고치면 된다. 세트 수도 지난번과 같게 맞춘다. 필드가
 * 어긋나지 않도록 그때의 기록 방식(metricType)도 함께 가져온다.
 */
export function prefillFromPrevious(
  item: SessionExercise,
  record: PreviousRecord,
): SessionExercise {
  const sets: SessionSet[] = record.sets.map((s, i) => {
    const next: SessionSet = {
      setNumber: i + 1,
      weightKg: s.weightKg,
      reps: s.reps,
      completed: false,
    }
    if (s.durationSec !== undefined) next.durationSec = s.durationSec
    if (s.distanceKm !== undefined) next.distanceKm = s.distanceKm
    return next
  })
  return { ...item, sets, metricType: record.metricType }
}
