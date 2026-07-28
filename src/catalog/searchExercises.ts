import type { Exercise } from './types'

export interface ExerciseFilters {
  bodyPart?: string
  equipment?: string
}

export function searchExercises(
  exercises: Exercise[],
  query: string,
  filters: ExerciseFilters = {},
): Exercise[] {
  const q = query.trim().toLowerCase()
  return exercises.filter((ex) => {
    if (filters.bodyPart && ex.bodyPart !== filters.bodyPart) return false
    if (filters.equipment && ex.equipment !== filters.equipment) return false
    if (!q) return true
    const hay = [ex.name, ex.target, ...(ex.aliases ?? [])]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}
