import { describe, expect, it } from 'vitest'
import {
  completeHint,
  formatDuration,
  formatMetricSet,
  isSetComplete,
  metricFields,
  metricTypeOf,
  parseDuration,
} from './metrics'
import type { SessionSet } from '../types/models'

const mkSet = (patch: Partial<SessionSet> = {}): SessionSet => ({
  setNumber: 1,
  weightKg: 0,
  reps: 0,
  completed: false,
  ...patch,
})

describe('metricTypeOf', () => {
  it('defaults legacy items without metricType to weight_reps', () => {
    expect(metricTypeOf({})).toBe('weight_reps')
    expect(metricTypeOf({ metricType: undefined })).toBe('weight_reps')
  })

  it('returns the explicit metric type', () => {
    expect(metricTypeOf({ metricType: 'duration' })).toBe('duration')
  })
})

describe('formatDuration / parseDuration', () => {
  it('formats seconds as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(90)).toBe('1:30')
    expect(formatDuration(1230)).toBe('20:30')
  })

  it('parses mm:ss and bare minutes', () => {
    expect(parseDuration('20:30')).toBe(1230)
    expect(parseDuration('1:05')).toBe(65)
    expect(parseDuration('20')).toBe(1200)
    expect(parseDuration('')).toBe(0)
  })
})

describe('formatMetricSet', () => {
  it('weight_reps renders kg × reps, bodyweight when 0kg', () => {
    expect(formatMetricSet(mkSet({ weightKg: 60, reps: 8 }), 'weight_reps')).toBe('60 kg × 8회')
    expect(formatMetricSet(mkSet({ weightKg: 0, reps: 12 }), 'weight_reps')).toBe('맨몸 × 12회')
  })

  it('duration_distance renders time and km', () => {
    expect(
      formatMetricSet(mkSet({ durationSec: 1230, distanceKm: 5 }), 'duration_distance'),
    ).toBe('20:30 · 5 km')
    expect(formatMetricSet(mkSet({ durationSec: 600 }), 'duration_distance')).toBe('10:00 · —')
  })

  it('duration renders time only', () => {
    expect(formatMetricSet(mkSet({ durationSec: 300 }), 'duration')).toBe('5:00')
  })

  it('reps renders count only', () => {
    expect(formatMetricSet(mkSet({ reps: 15 }), 'reps')).toBe('15회')
  })
})

describe('isSetComplete', () => {
  it('validates each metric type', () => {
    expect(isSetComplete(mkSet({ weightKg: 20, reps: 5 }), 'weight_reps')).toBe(true)
    expect(isSetComplete(mkSet({ weightKg: 0, reps: 5 }), 'weight_reps')).toBe(false)
    expect(isSetComplete(mkSet({ durationSec: 60, distanceKm: 1 }), 'duration_distance')).toBe(true)
    expect(isSetComplete(mkSet({ durationSec: 0 }), 'duration_distance')).toBe(false)
    expect(isSetComplete(mkSet({ durationSec: 60 }), 'duration')).toBe(true)
    expect(isSetComplete(mkSet({ reps: 10 }), 'reps')).toBe(true)
    expect(isSetComplete(mkSet({ reps: 0 }), 'reps')).toBe(false)
  })
})

describe('metricFields / completeHint', () => {
  it('exposes the visible fields per type', () => {
    expect(metricFields('weight_reps')).toEqual({
      weight: true,
      reps: true,
      duration: false,
      distance: false,
    })
    expect(metricFields('duration')).toEqual({
      weight: false,
      reps: false,
      duration: true,
      distance: false,
    })
  })

  it('gives a Korean hint per type', () => {
    expect(completeHint('reps')).toContain('횟수')
    expect(completeHint('duration')).toContain('시간')
  })
})
