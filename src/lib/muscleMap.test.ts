import { describe, expect, it } from 'vitest'
import {
  activationFor,
  isWholeBody,
  muscleGroupKo,
  summarizeActivation,
  toMuscleGroup,
} from './muscleMap'

describe('toMuscleGroup', () => {
  // The catalog mixes sources, so the same muscle arrives under several names.
  it('folds synonyms onto one group', () => {
    expect(toMuscleGroup('abs')).toBe('abs')
    expect(toMuscleGroup('abdominals')).toBe('abs')
    expect(toMuscleGroup('rectus abdominis')).toBe('abs')

    expect(toMuscleGroup('quads')).toBe('quadriceps')
    expect(toMuscleGroup('quadriceps')).toBe('quadriceps')
    expect(toMuscleGroup('hip flexors')).toBe('quadriceps')

    expect(toMuscleGroup('glutes')).toBe('gluteal')
    expect(toMuscleGroup('gluteus maximus')).toBe('gluteal')
  })

  // The figure draws front and back deltoids separately, so a spelling that
  // names the side has to keep it.
  it('keeps the side when a deltoid name says which one', () => {
    expect(toMuscleGroup('anterior deltoids')).toBe('front-deltoids')
    expect(toMuscleGroup('rear deltoids')).toBe('back-deltoids')
    expect(toMuscleGroup('posterior deltoid')).toBe('back-deltoids')
  })

  // The catalog has no lat region in the figure, so lats fold into upper back.
  it('folds lats into the upper back region the figure can draw', () => {
    expect(toMuscleGroup('lats')).toBe('upper-back')
    expect(toMuscleGroup('latissimus dorsi')).toBe('upper-back')
    expect(toMuscleGroup('rhomboids')).toBe('upper-back')
  })

  it('is case and whitespace tolerant', () => {
    expect(toMuscleGroup('  Latissimus Dorsi ')).toBe('upper-back')
  })

  it('returns null for names it does not know', () => {
    expect(toMuscleGroup('cardiovascular system')).toBeNull()
    expect(toMuscleGroup('varies by machine')).toBeNull()
    expect(toMuscleGroup('')).toBeNull()
  })
})

describe('activationFor', () => {
  it('marks target as primary and secondary muscles as secondary', () => {
    const result = activationFor([
      { target: 'pectorals', secondaryMuscles: ['triceps', 'anterior deltoids'] },
    ])
    expect(result).toEqual({
      chest: 'primary',
      triceps: 'secondary',
      'front-deltoids': 'secondary',
    })
  })

  // "delts" alone does not say which side, so both get lit rather than guessing
  // one and under-reporting the work.
  it('lights both deltoids when the name has no side', () => {
    const result = activationFor([{ target: 'delts' }])
    expect(result['front-deltoids']).toBe('primary')
    expect(result['back-deltoids']).toBe('primary')
  })

  // Across a whole routine a muscle may be primary in one lift and assisting in
  // another; the stronger role has to win or the map loses its focus.
  it('lets primary win over secondary for the same group', () => {
    const result = activationFor([
      { target: 'lats', secondaryMuscles: ['biceps'] },
      { target: 'biceps', secondaryMuscles: [] },
    ])
    expect(result.biceps).toBe('primary')
    expect(result['upper-back']).toBe('primary')
  })

  it('merges several exercises', () => {
    const result = activationFor([
      { target: 'quadriceps', secondaryMuscles: ['glutes'] },
      { target: 'hamstrings', secondaryMuscles: ['calves'] },
    ])
    expect(result).toEqual({
      quadriceps: 'primary',
      hamstring: 'primary',
      gluteal: 'secondary',
      calves: 'secondary',
    })
  })

  it('ignores unknown muscle names instead of guessing', () => {
    const result = activationFor([
      { target: 'cardiovascular system', secondaryMuscles: ['ankles'] },
    ])
    expect(result).toEqual({})
  })

  it('handles missing fields', () => {
    expect(activationFor([{}])).toEqual({})
    expect(activationFor([])).toEqual({})
  })
})

describe('isWholeBody', () => {
  it('flags cardio and full-body work', () => {
    expect(isWholeBody({ target: 'cardiovascular system' })).toBe(true)
    expect(isWholeBody({ target: 'full body' })).toBe(true)
  })

  it('does not flag a normal lift', () => {
    expect(isWholeBody({ target: 'pectorals' })).toBe(false)
    expect(isWholeBody({})).toBe(false)
  })
})

describe('summarizeActivation', () => {
  it('lists primary first, then secondary after a separator', () => {
    const text = summarizeActivation({ chest: 'primary', triceps: 'secondary' })
    expect(text).toBe('가슴 · 삼두')
  })

  it('omits the separator when only one kind is present', () => {
    expect(summarizeActivation({ chest: 'primary' })).toBe('가슴')
    expect(summarizeActivation({ triceps: 'secondary' })).toBe('삼두')
    expect(summarizeActivation({})).toBe('')
  })
})

describe('muscleGroupKo', () => {
  it('gives a Korean label for every group', () => {
    expect(muscleGroupKo('upper-back')).toBe('등')
    expect(muscleGroupKo('lower-back')).toBe('척추기립근')
    expect(muscleGroupKo('back-deltoids')).toBe('후면 어깨')
  })
})
