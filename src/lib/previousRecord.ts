import type { MetricType, Session, SessionSet } from '../types/models'
import { metricTypeOf } from './metrics'

export interface PreviousRecord {
  /** ISO timestamp of the previous session (endedAt when present). */
  date: string
  /** Completed sets from that session, in set order. */
  sets: SessionSet[]
  /** Metric type of that session exercise (legacy items → `weight_reps`). */
  metricType: MetricType
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
    }
  }
  return null
}
