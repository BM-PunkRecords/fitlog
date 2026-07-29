import { describe, expect, it } from 'vitest'
import { clampRest, formatRest, hasRoutineRestOverride, resolveRest, routineRestFor } from './rest'

describe('resolveRest', () => {
  it('falls back to the app default for legacy items without a value', () => {
    expect(resolveRest(undefined, 90)).toBe(90)
  })

  it('uses the exercise value when set', () => {
    expect(resolveRest(45, 90)).toBe(45)
  })

  it('treats an explicit 0 as no rest, not the default', () => {
    expect(resolveRest(0, 90)).toBe(0)
  })
})

describe('routineRestFor', () => {
  it('returns the app default for a legacy routine (no overrides)', () => {
    expect(routineRestFor({}, 'x', 90)).toBe(90)
  })

  it('returns the app default when the exercise has no override', () => {
    expect(routineRestFor({ restByExerciseId: { a: 30 } }, 'b', 90)).toBe(90)
  })

  it('returns the override when present', () => {
    expect(routineRestFor({ restByExerciseId: { a: 30 } }, 'a', 90)).toBe(30)
  })
})

describe('hasRoutineRestOverride', () => {
  it('is false for legacy routines and unset exercises', () => {
    expect(hasRoutineRestOverride({}, 'a')).toBe(false)
    expect(hasRoutineRestOverride({ restByExerciseId: { a: 30 } }, 'b')).toBe(false)
  })

  it('is true when the exercise has an override', () => {
    expect(hasRoutineRestOverride({ restByExerciseId: { a: 30 } }, 'a')).toBe(true)
  })
})

describe('formatRest', () => {
  it('formats sub-minute durations in seconds', () => {
    expect(formatRest(30)).toBe('30초')
    expect(formatRest(45)).toBe('45초')
  })

  it('formats whole minutes without seconds', () => {
    expect(formatRest(60)).toBe('1분')
    expect(formatRest(120)).toBe('2분')
  })

  it('formats minutes and seconds compactly', () => {
    expect(formatRest(90)).toBe('1분 30초')
    expect(formatRest(185)).toBe('3분 5초')
  })
})

describe('clampRest', () => {
  it('rounds to whole seconds', () => {
    expect(clampRest(89.6)).toBe(90)
  })

  it('never goes below zero', () => {
    expect(clampRest(-30)).toBe(0)
  })

  it('caps at an hour', () => {
    expect(clampRest(99999)).toBe(3600)
  })

  it('handles non-finite input', () => {
    expect(clampRest(Number.NaN)).toBe(0)
  })
})
