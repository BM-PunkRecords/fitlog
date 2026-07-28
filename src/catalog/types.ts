export interface ExerciseMedia {
  male?: string
  female?: string
}

export interface Exercise {
  id: string
  name: string
  aliases?: string[]
  bodyPart: string
  target: string
  secondaryMuscles: string[]
  equipment: string
  muscleGroup?: string
  difficulty: string
  compound?: boolean
  unilateral?: boolean
  shortDescription?: string
  instructions?: string
  steps: string[]
  formCues: string[]
  commonMistakes: string[]
  breathing?: string
  videos: ExerciseMedia
  thumbnails: ExerciseMedia
}
