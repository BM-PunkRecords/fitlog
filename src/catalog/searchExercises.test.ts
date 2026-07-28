import { describe, it, expect } from 'vitest'
import { searchExercises } from './searchExercises'
import type { Exercise } from './types'

const sample: Exercise[] = [
  {
    id: '1',
    name: 'Barbell Bench Press',
    aliases: ['bench press'],
    bodyPart: 'chest',
    target: 'pectorals',
    secondaryMuscles: ['triceps'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    steps: [],
    formCues: [],
    commonMistakes: [],
    videos: {},
    thumbnails: {},
  },
  {
    id: '2',
    name: 'Squat',
    bodyPart: 'upper legs',
    target: 'quads',
    secondaryMuscles: [],
    equipment: 'barbell',
    difficulty: 'intermediate',
    steps: [],
    formCues: [],
    commonMistakes: [],
    videos: {},
    thumbnails: {},
  },
]

describe('searchExercises', () => {
  it('matches name or alias', () => {
    expect(searchExercises(sample, 'bench').map((e) => e.id)).toEqual(['1'])
  })

  it('matches Korean display name shown in the UI', () => {
    const catalog: Exercise[] = [
      {
        ...sample[0],
        id: 'g',
        name: 'All Fours Groin Stretch',
        aliases: [],
        bodyPart: 'hips',
        target: 'adductors',
        equipment: 'body weight',
      },
      {
        ...sample[0],
        id: 'p',
        name: 'Band Assisted Pull-up',
        aliases: [],
        bodyPart: 'back',
        target: 'lats',
        equipment: 'band',
      },
    ]
    expect(searchExercises(catalog, '사타구니').map((e) => e.id)).toEqual(['g'])
    expect(searchExercises(catalog, '풀업').map((e) => e.id)).toEqual(['p'])
    expect(searchExercises(catalog, '밴드').map((e) => e.id)).toEqual(['p'])
  })

  it('matches Korean target / equipment labels', () => {
    expect(searchExercises(sample, '대흉근').map((e) => e.id)).toEqual(['1'])
    expect(searchExercises(sample, '바벨').map((e) => e.id).sort()).toEqual(['1', '2'])
  })

  it('filters by bodyPart', () => {
    expect(searchExercises(sample, '', { bodyPart: 'chest' }).map((e) => e.id)).toEqual([
      '1',
    ])
  })
})
