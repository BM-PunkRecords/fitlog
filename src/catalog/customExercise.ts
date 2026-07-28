import type { Exercise } from '../catalog/types'
import type { CustomExercise } from '../types/models'

export function customExerciseToCatalog(custom: CustomExercise): Exercise {
  return {
    id: custom.id,
    name: custom.name,
    bodyPart: custom.bodyPart,
    target: custom.target,
    secondaryMuscles: [],
    equipment: custom.equipment,
    difficulty: 'intermediate',
    steps: [],
    formCues: [],
    commonMistakes: [],
    videos: {},
    thumbnails: {},
    source: 'custom',
  }
}
