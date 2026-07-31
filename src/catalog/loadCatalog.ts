import type { Exercise } from './types'
import base from '../data/exercises.json'
import supplement from '../data/exercises.supplement.json'
import { dedupeCatalog } from './dedupe'

/**
 * 번들 카탈로그 + 보조 카탈로그를 합쳐 돌려준다.
 *
 * 보조 쪽은 이름이 겹치면 건너뛴다(원래부터 그랬다). 여기에 더해 **번들 카탈로그
 * 안에 있던 중복까지** 정리한다 — 같은 운동이 두 벌 들어 있어 목록에 나란히
 * 뜨던 항목들이다. 자세한 규칙과 옛 id 보존은 `dedupe.ts` 참조.
 */
export function loadCatalog(): Exercise[] {
  return loadCatalogWithAliases().catalog
}

/** 병합으로 사라진 id 별칭까지 필요할 때(조회 인덱스 구성) 쓴다. */
export function loadCatalogWithAliases() {
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
  return dedupeCatalog(merged)
}
