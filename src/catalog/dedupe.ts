import type { Exercise } from './types'

/**
 * 카탈로그 중복 정리.
 *
 * 번들 카탈로그에는 같은 운동이 두 번 들어간 항목이 있다(출처를 합치면서 생긴
 * 것으로, `target`이나 `secondaryMuscles`만 미세하게 다르다). 목록에 나란히
 * 뜨면 사용자는 무엇이 다른지 알 수 없으므로 하나로 합친다.
 *
 * **삭제가 아니라 병합이다.** 이미 저장된 루틴·세션이 사라지는 쪽 `id`를 참조하고
 * 있을 수 있으므로, 없앤 id는 남긴 id를 가리키는 별칭으로 남긴다. 별칭까지 담은
 * 조회용 인덱스는 `buildExerciseIndex`가 만든다.
 */

/**
 * 이름이 같지 않아 자동 병합에 걸리지 않지만 실제로는 같은 운동인 쌍.
 * `from`(버릴 id) → `to`(남길 id).
 */
const MANUAL_MERGES: Array<{ from: string; to: string }> = [
  // 둘 다 "머신으로 하는 유산소"라 내용이 같다. 시연 영상이 있는 쪽을 남긴다.
  { from: 'drv-cardio-exercises-machine', to: 'drv-cardio-exercises-machines' },
]

/** 시연 영상이 있는 항목을 우선 남긴다 — 없는 쪽을 남기면 화면이 비어 보인다. */
function score(ex: Exercise): number {
  const hasVideo = Boolean(ex.videos?.male ?? ex.videos?.female)
  const hasThumb = Boolean(ex.thumbnails?.male ?? ex.thumbnails?.female)
  const secondary = ex.secondaryMuscles?.length ?? 0
  return (hasVideo ? 100 : 0) + (hasThumb ? 10 : 0) + secondary
}

export interface DedupedCatalog {
  catalog: Exercise[]
  /** 사라진 id → 남은 id */
  aliases: Map<string, string>
}

export function dedupeCatalog(input: Exercise[]): DedupedCatalog {
  const byName = new Map<string, Exercise[]>()
  for (const ex of input) {
    const key = ex.name.trim().toLowerCase()
    const list = byName.get(key)
    if (list) list.push(ex)
    else byName.set(key, [ex])
  }

  const aliases = new Map<string, string>()
  const keptByName = new Map<string, Exercise>()

  for (const [key, list] of byName) {
    if (list.length === 1) {
      keptByName.set(key, list[0])
      continue
    }
    const winner = list.reduce((best, ex) => (score(ex) > score(best) ? ex : best))
    keptByName.set(key, winner)
    for (const ex of list) {
      if (ex.id !== winner.id) aliases.set(ex.id, winner.id)
    }
  }

  // 원래 순서를 지키면서 살아남은 것만 남긴다.
  const kept = new Set([...keptByName.values()].map((e) => e.id))
  const catalog = input.filter((e) => kept.has(e.id))

  // 이름이 달라 위에서 못 잡은 쌍을 마저 병합한다.
  const present = new Set(catalog.map((e) => e.id))
  const removed = new Set<string>()
  for (const { from, to } of MANUAL_MERGES) {
    if (!present.has(from) || !present.has(to)) continue
    aliases.set(from, to)
    removed.add(from)
  }

  // 별칭이 별칭을 가리키는 경우까지 최종 목적지로 펴둔다.
  for (const [from] of aliases) {
    let to = aliases.get(from)!
    const seen = new Set([from])
    while (aliases.has(to) && !seen.has(to)) {
      seen.add(to)
      to = aliases.get(to)!
    }
    aliases.set(from, to)
  }

  return {
    catalog: removed.size ? catalog.filter((e) => !removed.has(e.id)) : catalog,
    aliases,
  }
}

/**
 * id로 운동을 찾는 인덱스. 병합으로 사라진 옛 id도 남은 운동을 가리키므로,
 * 예전에 저장된 루틴·기록이 계속 열린다.
 */
export function buildExerciseIndex(
  catalog: Exercise[],
  aliases?: Map<string, string>,
): Map<string, Exercise> {
  const index = new Map(catalog.map((e) => [e.id, e]))
  if (aliases) {
    for (const [from, to] of aliases) {
      const target = index.get(to)
      if (target && !index.has(from)) index.set(from, target)
    }
  }
  return index
}
