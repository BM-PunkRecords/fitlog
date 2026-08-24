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
  /**
   * 시연 동작 프레임(시작→끝 자세). 원본 영상 CDN이 폐쇄돼, free-exercise-db의
   * 2장 스틸을 번갈아 재생해 움직임을 흉내 낸다. 있으면 영상/썸네일보다 우선한다.
   */
  frames?: string[]
  /** bundled catalog | yuhonas supplement | user-created */
  source?: 'bundled' | 'supplement' | 'custom'
}
