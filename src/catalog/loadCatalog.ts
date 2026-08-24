import type { Exercise } from './types'
import base from '../data/exercises.json'
import supplement from '../data/exercises.supplement.json'
import overrides from '../data/exerciseMediaOverrides.json'
import { dedupeCatalog } from './dedupe'

/**
 * 번들 데이터셋의 사진·영상은 상위 저장소의 Cloudflare R2 CDN에 있었는데, 그
 * 공개 접근이 막혔다(모든 URL이 401). 죽은 URL을 그대로 쓰면 목록마다 깨진
 * 이미지가 뜨므로 로드 시점에 손본다:
 *  - 매칭되는 운동은 free-exercise-db(yuhonas, GitHub 호스팅, 안정적)의 사진으로
 *    교체한다(`exerciseMediaOverrides.json`).
 *  - 대체 사진이 없는 운동은 죽은 URL을 비워, `ExercisePreview`가 깨진 이미지
 *    대신 플레이스홀더를 그리게 한다.
 */
const DEAD_MEDIA_HOST = 'r2.dev'
const mediaOverrides = overrides as Record<string, string[]>

function isDeadUrl(url?: string): boolean {
  return typeof url === 'string' && url.includes(DEAD_MEDIA_HOST)
}

function fixMedia(ex: Exercise): Exercise {
  const frames = mediaOverrides[ex.id]
  if (frames?.length) {
    // yuhonas는 정지 이미지만 있다 — 시작/끝 2장을 번갈아 재생해 움직임을 흉내 내고
    // (frames), 죽은 영상 URL은 비운다. 첫 프레임은 poster 자리로도 쓴다.
    return {
      ...ex,
      frames,
      thumbnails: { male: frames[0], female: frames[0] },
      videos: {},
    }
  }
  const thumbDead = isDeadUrl(ex.thumbnails?.male) || isDeadUrl(ex.thumbnails?.female)
  const videoDead = isDeadUrl(ex.videos?.male) || isDeadUrl(ex.videos?.female)
  if (!thumbDead && !videoDead) return ex
  return {
    ...ex,
    thumbnails: thumbDead ? {} : ex.thumbnails,
    videos: videoDead ? {} : ex.videos,
  }
}

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
  const { catalog, aliases } = dedupeCatalog(merged)
  return { catalog: catalog.map(fixMedia), aliases }
}
