import type { Session } from '../types/models'
import { sessionVolume } from './volume'

export interface WeeklyStats {
  sessionCount: number
  totalVolume: number
}

export function weeklyStats(sessions: Session[], now = new Date()): WeeklyStats {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const completed = sessions.filter((s) => {
    if (s.status !== 'completed') return false
    const ended = new Date(s.endedAt ?? s.startedAt)
    return ended >= weekAgo && ended <= now
  })
  return {
    sessionCount: completed.length,
    totalVolume: completed.reduce((n, s) => n + sessionVolume(s), 0),
  }
}
