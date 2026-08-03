/**
 * 칼로리 **추정**.
 *
 * 정확한 소모량은 개인의 체성분·강도·효율에 따라 크게 달라져 앱이 알 수 없다.
 * 여기서 하는 것은 널리 쓰이는 MET 공식의 근사다:
 *
 *     kcal = MET × 체중(kg) × 시간(h)
 *
 * 두 가지가 필요한데 둘 다 우리에게 없다시피 하다.
 *
 * 1. **체중** — 설정에서 받는다. 없으면 계산 자체를 하지 않는다(임의의 기본
 *    체중으로 그럴듯한 숫자를 만들면 그건 추정이 아니라 창작이다).
 * 2. **운동별 MET** — 카탈로그에 없다. 그래서 부위·장비·복합운동 여부로
 *    대분류해 근사한다. 실제 값과 다를 수 있고, 그래서 화면에 "추정"이라고
 *    밝힌다.
 *
 * 시간 역시 중량 운동에는 기록되지 않으므로 세트당 대표 시간을 가정한다.
 */

import type { Session, SessionExercise } from '../types/models'
import { metricTypeOf } from './metrics'

export interface MetSource {
  bodyPart?: string
  equipment?: string
  compound?: boolean
  target?: string
}

/** 중량 세트 하나가 실제로 힘을 쓰는 대략적인 시간(초). */
const SECONDS_PER_STRENGTH_SET = 40

/**
 * 운동 하나의 MET 근사값.
 *
 * 출처는 Compendium of Physical Activities의 대분류 값이다(웨이트 일반 3.5,
 * 고강도 6.0, 맨몸 서킷 8.0, 유산소 7.0 내외, 스트레칭 2.3).
 */
export function estimateMet(source: MetSource | undefined): number {
  if (!source) return 3.5

  const part = (source.bodyPart ?? '').toLowerCase()
  const equipment = (source.equipment ?? '').toLowerCase()
  const target = (source.target ?? '').toLowerCase()

  if (part === 'cardio' || target === 'cardiovascular system') return 7.0
  if (target === 'full body') return 8.0
  // 맨몸 복합운동(버피·마운틴클라이머류)은 쉬는 구간이 없어 강도가 높다.
  if (equipment === 'body weight' && source.compound) return 8.0
  if (equipment === 'body weight') return 3.8
  // 큰 근육을 쓰는 복합 웨이트.
  if (source.compound) return 6.0
  return 3.5
}

/** 이 운동에 실제로 쓴 시간(초) — 시간 기록이 없으면 세트 수로 추정한다. */
export function activeSecondsFor(item: SessionExercise): number {
  const done = item.sets.filter((s) => s.completed)
  const type = metricTypeOf(item)
  if (type === 'duration' || type === 'duration_distance') {
    return done.reduce((n, s) => n + (s.durationSec ?? 0), 0)
  }
  return done.length * SECONDS_PER_STRENGTH_SET
}

/**
 * 세션의 추정 소모 칼로리(kcal). 체중을 모르면 null.
 *
 * `metFor`는 운동 id로 MET 산출에 필요한 정보를 돌려준다(카탈로그 조회).
 */
export function estimateSessionCalories(
  session: Session,
  bodyWeightKg: number | undefined,
  metFor: (exerciseId: string) => MetSource | undefined,
): number | null {
  if (!bodyWeightKg || bodyWeightKg <= 0) return null

  const kcal = session.items.reduce((sum, item) => {
    const hours = activeSecondsFor(item) / 3600
    return sum + estimateMet(metFor(item.exerciseId)) * bodyWeightKg * hours
  }, 0)

  return Math.round(kcal)
}
