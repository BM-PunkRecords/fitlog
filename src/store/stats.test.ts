import { describe, expect, it } from 'vitest'
import type { Session, SessionSet } from '../types/models'
import { bodyPartBreakdown, filterByRange, rangeStats, volumeSeries } from './stats'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-08-11T12:00:00.000Z')

function set(weightKg: number, reps: number, completed = true): SessionSet {
  return { setNumber: 1, weightKg, reps, completed }
}

function sess(id: string, endedDaysAgo: number, items: Session['items']): Session {
  const ended = new Date(NOW.getTime() - endedDaysAgo * DAY)
  return {
    id,
    routineId: null,
    startedAt: new Date(ended.getTime() - 30 * 60 * 1000).toISOString(),
    endedAt: ended.toISOString(),
    status: 'completed',
    items,
  }
}

function item(exerciseId: string, sets: SessionSet[]) {
  return { exerciseId, order: 0, sets }
}

const bench = () => item('bench', [set(60, 10), set(60, 10)]) // vol 1200, 2 sets
const squat = () => item('squat', [set(100, 5)]) // vol 500, 1 set

describe('filterByRange', () => {
  const sessions = [
    sess('today', 0, [bench()]),
    sess('d20', 20, [bench()]),
    sess('d100', 100, [bench()]),
    { ...sess('inprogress', 1, [bench()]), status: 'in_progress' as const },
  ]

  it('7d keeps only the last week of completed sessions', () => {
    expect(filterByRange(sessions, '7d', NOW).map((s) => s.id)).toEqual(['today'])
  })

  it('30d reaches back a month', () => {
    expect(filterByRange(sessions, '30d', NOW).map((s) => s.id).sort()).toEqual(['d20', 'today'])
  })

  it('all keeps every completed session but excludes in-progress', () => {
    expect(filterByRange(sessions, 'all', NOW).map((s) => s.id).sort()).toEqual([
      'd100',
      'd20',
      'today',
    ])
  })
})

describe('rangeStats', () => {
  it('aggregates sessions, sets, volume, active days', () => {
    const sessions = [
      sess('a', 0, [bench(), squat()]), // vol 1700, 3 sets
      sess('b', 0, [bench()]), // same day → activeDays counts once
      sess('c', 3, [squat()]), // vol 500, 1 set
    ]
    const s = rangeStats(sessions, '7d', NOW)
    expect(s.sessionCount).toBe(3)
    expect(s.totalSets).toBe(3 + 2 + 1)
    expect(s.totalVolume).toBe(1700 + 1200 + 500)
    expect(s.activeDays).toBe(2)
    expect(s.avgVolume).toBe(Math.round((1700 + 1200 + 500) / 3))
  })

  it('is all zeroes with no sessions in range', () => {
    const s = rangeStats([sess('old', 100, [bench()])], '7d', NOW)
    expect(s).toMatchObject({ sessionCount: 0, totalVolume: 0, totalSets: 0, activeDays: 0 })
  })
})

describe('volumeSeries', () => {
  it('7d returns 7 daily buckets ending today', () => {
    const series = volumeSeries([sess('t', 0, [bench()]), sess('y', 1, [squat()])], '7d', NOW)
    expect(series).toHaveLength(7)
    expect(series[6].volume).toBe(1200) // today
    expect(series[5].volume).toBe(500) // yesterday
    expect(series[0].volume).toBe(0) // 6 days ago, empty
  })

  it('30d returns 30 daily buckets', () => {
    expect(volumeSeries([sess('t', 0, [bench()])], '30d', NOW)).toHaveLength(30)
  })

  it('all buckets by month starting from the first month with data', () => {
    const series = volumeSeries([sess('t', 0, [bench()]), sess('m2', 40, [squat()])], 'all', NOW)
    // 40일 전 = 약 2개월 스팬 → 첫 데이터 달부터 잘려 나온다.
    expect(series.length).toBeGreaterThanOrEqual(2)
    expect(series[series.length - 1].volume).toBe(1200) // 이번 달
  })

  it('all is empty with no data', () => {
    expect(volumeSeries([], 'all', NOW)).toEqual([])
  })
})

describe('bodyPartBreakdown', () => {
  const resolve = (id: string) =>
    ({
      bench: { bodyPart: 'chest', target: 'chest', secondaryMuscles: ['triceps'] },
      squat: { bodyPart: 'upper legs', target: 'quads', secondaryMuscles: ['glutes'] },
    })[id]

  it('ranks body parts by completed sets and paints the muscle map', () => {
    const sessions = [sess('a', 0, [bench(), squat()]), sess('b', 2, [bench()])]
    const { parts, activation } = bodyPartBreakdown(sessions, resolve, '7d', NOW)

    // chest: 2 + 2 = 4 sets, upper legs: 1 set → chest ranks first
    expect(parts[0]).toMatchObject({ bodyPart: 'chest', label: '가슴', sets: 4 })
    expect(parts[1]).toMatchObject({ bodyPart: 'upper legs', sets: 1 })

    expect(activation.chest).toBe('primary')
    expect(activation.quadriceps).toBe('primary')
    expect(activation.triceps).toBe('secondary')
  })

  it('buckets unresolved exercises under 기타', () => {
    const { parts } = bodyPartBreakdown([sess('a', 0, [item('ghost', [set(0, 0)])])], () => undefined, '7d', NOW)
    // 완료했지만 카탈로그에 없는 운동 (set completed but weight/reps 0 → still a completed set)
    expect(parts.find((p) => p.label === '기타')?.sets).toBe(1)
  })
})
