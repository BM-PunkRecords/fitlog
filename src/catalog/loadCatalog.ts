import type { Exercise } from './types'
import base from '../data/exercises.json'
import supplement from '../data/exercises.supplement.json'

export function loadCatalog(): Exercise[] {
  const bundled = (base as Exercise[]).map((e) => ({
    ...e,
    source: e.source ?? ('bundled' as const),
  }))
  const extra = supplement as Exercise[]
  const seen = new Set(bundled.map((e) => e.name.toLowerCase()))
  const merged = [...bundled]
  for (const ex of extra) {
    if (seen.has(ex.name.toLowerCase())) continue
    merged.push({ ...ex, source: ex.source ?? 'supplement' })
    seen.add(ex.name.toLowerCase())
  }
  return merged
}
