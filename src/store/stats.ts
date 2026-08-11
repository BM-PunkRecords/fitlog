import { bodyPartKo } from '../lib/labelsKo'
import { activationFor, type MuscleActivation } from '../lib/muscleMap'
import type { Session } from '../types/models'
import {
  exerciseVolume,
  sessionCompletedSets,
  sessionDurationSec,
  sessionVolume,
} from './volume'

/**
 * 통계 집계.
 *
 * 화면은 "최근 7일 총 볼륨" 하나만 보여줬는데, 볼륨만으로는 무엇이 나아졌는지
 * 읽히지 않는다. 그래서 (1) 기간을 7일·30일·전체로 고르게 하고, (2) 세션·세트·
 * 운동한 날·운동 시간까지 함께 집계하며, (3) 볼륨 추이와 부위 분포를 시각화용
 * 데이터로 내보낸다. 계산은 전부 순수 함수라 `now`를 주입해 결정적으로 테스트한다.
 */

export type RangeKey = '7d' | '30d' | 'all'

const DAY_MS = 24 * 60 * 60 * 1000

function endedDate(s: Session): Date {
  return new Date(s.endedAt ?? s.startedAt)
}

/** 로컬 날짜 기준 키(YYYY-M-D) — "운동한 날"을 세션이 아니라 날짜로 센다. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** 기간의 시작 시각(포함). 'all'이면 제한 없음(null). */
function rangeStart(range: RangeKey, now: Date): Date | null {
  if (range === 'all') return null
  const days = range === '7d' ? 7 : 30
  // 오늘을 포함한 지난 N일 → (N-1)일 전 자정부터.
  const start = new Date(now.getTime() - (days - 1) * DAY_MS)
  start.setHours(0, 0, 0, 0)
  return start
}

export function filterByRange(
  sessions: Session[],
  range: RangeKey,
  now: Date = new Date(),
): Session[] {
  const start = rangeStart(range, now)
  return sessions.filter((s) => {
    if (s.status !== 'completed') return false
    const ended = endedDate(s)
    if (ended > now) return false
    if (start && ended < start) return false
    return true
  })
}

export interface RangeStats {
  sessionCount: number
  totalVolume: number
  totalSets: number
  totalDurationSec: number
  /** 실제로 운동한 날 수(하루 두 세션이면 1로 센다). */
  activeDays: number
  /** 세션당 평균 볼륨. */
  avgVolume: number
}

export function rangeStats(
  sessions: Session[],
  range: RangeKey,
  now: Date = new Date(),
): RangeStats {
  const inRange = filterByRange(sessions, range, now)
  const totalVolume = inRange.reduce((n, s) => n + sessionVolume(s), 0)
  const totalSets = inRange.reduce((n, s) => n + sessionCompletedSets(s), 0)
  const totalDurationSec = inRange.reduce((n, s) => n + sessionDurationSec(s), 0)
  const days = new Set(inRange.map((s) => dayKey(endedDate(s))))
  return {
    sessionCount: inRange.length,
    totalVolume,
    totalSets,
    totalDurationSec,
    activeDays: days.size,
    avgVolume: inRange.length ? Math.round(totalVolume / inRange.length) : 0,
  }
}

export interface VolumeBucket {
  label: string
  volume: number
  sets: number
  /** 툴팁·접근성용 상세 라벨. */
  detail: string
}

/**
 * 볼륨 추이 막대용 버킷.
 * - 7일/30일: 하루 단위.
 * - 전체: 월 단위, 최근 12개월(데이터가 시작되는 달부터).
 */
export function volumeSeries(
  sessions: Session[],
  range: RangeKey,
  now: Date = new Date(),
): VolumeBucket[] {
  const completed = sessions.filter((s) => s.status === 'completed' && endedDate(s) <= now)

  if (range === 'all') {
    if (completed.length === 0) return []
    const buckets: VolumeBucket[] = []
    for (let i = 11; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const inMonth = completed.filter((s) => {
        const e = endedDate(s)
        return e >= from && e < to
      })
      buckets.push({
        label: `${from.getMonth() + 1}월`,
        volume: inMonth.reduce((n, s) => n + sessionVolume(s), 0),
        sets: inMonth.reduce((n, s) => n + sessionCompletedSets(s), 0),
        detail: `${from.getFullYear()}년 ${from.getMonth() + 1}월`,
      })
    }
    // 첫 기록이 나오기 전 앞쪽 빈 달은 잘라 낸다.
    const firstIdx = buckets.findIndex((b) => b.volume > 0 || b.sets > 0)
    return firstIdx <= 0 ? buckets : buckets.slice(firstIdx)
  }

  const days = range === '7d' ? 7 : 30
  const base = new Date(now)
  base.setHours(0, 0, 0, 0)
  const buckets: VolumeBucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    const from = new Date(base.getTime() - i * DAY_MS)
    const to = new Date(from.getTime() + DAY_MS)
    const inDay = completed.filter((s) => {
      const e = endedDate(s)
      return e >= from && e < to
    })
    buckets.push({
      label: `${from.getMonth() + 1}/${from.getDate()}`,
      volume: inDay.reduce((n, s) => n + sessionVolume(s), 0),
      sets: inDay.reduce((n, s) => n + sessionCompletedSets(s), 0),
      detail: `${from.getMonth() + 1}월 ${from.getDate()}일`,
    })
  }
  return buckets
}

export interface PartStat {
  bodyPart: string
  label: string
  sets: number
  volume: number
}

interface ExerciseInfo {
  bodyPart?: string
  target?: string
  secondaryMuscles?: string[]
}

/**
 * 부위별로 얼마나 했는지(세트·볼륨) + 인체 도해용 활성 근육.
 *
 * 완료한 세트가 있는 운동만 센다. 카탈로그에서 못 찾는 운동(삭제된 커스텀 등)은
 * "기타"로 묶는다 — 세트 합계가 조용히 새지 않도록.
 */
export function bodyPartBreakdown(
  sessions: Session[],
  resolve: (exerciseId: string) => ExerciseInfo | undefined,
  range: RangeKey,
  now: Date = new Date(),
): { parts: PartStat[]; activation: MuscleActivation } {
  const inRange = filterByRange(sessions, range, now)
  const byPart = new Map<string, PartStat>()
  const trained: ExerciseInfo[] = []

  for (const s of inRange) {
    for (const item of s.items) {
      const sets = item.sets.filter((x) => x.completed).length
      if (sets === 0) continue
      const info = resolve(item.exerciseId)
      const bp = info?.bodyPart ?? 'other'
      const cur =
        byPart.get(bp) ?? { bodyPart: bp, label: bp === 'other' ? '기타' : bodyPartKo(bp), sets: 0, volume: 0 }
      cur.sets += sets
      cur.volume += exerciseVolume(item)
      byPart.set(bp, cur)
      if (info) trained.push(info)
    }
  }

  const parts = [...byPart.values()].sort((a, b) => b.sets - a.sets || b.volume - a.volume)
  return { parts, activation: activationFor(trained) }
}
