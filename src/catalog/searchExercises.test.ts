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

  it('filters by bodyPart', () => {
    expect(searchExercises(sample, '', { bodyPart: 'chest' }).map((e) => e.id)).toEqual([
      '1',
    ])
  })
})
