import { describe, it, expect } from 'vitest'
import { searchExercises } from './searchExercises'
import { loadCatalog } from './loadCatalog'
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

  it('finds machine shoulder press and barbell curl by Korean query', () => {
    const catalog = loadCatalog()

    const shoulder = searchExercises(catalog, '머신 숄더 프레스')
    expect(shoulder.some((e) => e.name === 'Machine Shoulder Press')).toBe(true)

    // 바벨 컬은 원래 있었지만 한글 별칭이 없어 안 잡히던 항목이다.
    expect(searchExercises(catalog, '바벨 바이셉 컬').some((e) => e.id === '0031')).toBe(true)
    expect(searchExercises(catalog, '바벨 이두').some((e) => e.id === '0031')).toBe(true)
  })
})
