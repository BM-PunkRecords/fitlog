import type { Exercise } from './types'
import raw from '../data/exercises.json'

export function loadCatalog(): Exercise[] {
  return raw as Exercise[]
}
