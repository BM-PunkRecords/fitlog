import type { Exercise } from './types'
import { bodyPartKo, equipmentKo, targetKo } from '../lib/labelsKo'
import { tKo } from '../lib/tKo'

export interface ExerciseFilters {
  bodyPart?: string
  equipment?: string
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** English + Korean labels users see in the picker. */
function searchableText(ex: Exercise): string {
  const aliases = ex.aliases ?? []
  return normalize(
    [
      ex.name,
      tKo(ex.name),
      ex.target,
      targetKo(ex.target),
      ex.bodyPart,
      bodyPartKo(ex.bodyPart),
      ex.equipment,
      equipmentKo(ex.equipment),
      ...aliases,
      ...aliases.map((a) => tKo(a)),
    ].join(' '),
  )
}

export function searchExercises(
  exercises: Exercise[],
  query: string,
  filters: ExerciseFilters = {},
): Exercise[] {
  const q = normalize(query)
  return exercises.filter((ex) => {
    if (filters.bodyPart && ex.bodyPart !== filters.bodyPart) return false
    if (filters.equipment && ex.equipment !== filters.equipment) return false
    if (!q) return true
    return searchableText(ex).includes(q)
  })
}
