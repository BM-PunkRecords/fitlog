/**
 * 시간표 기반 챌린지 — 정해진 초에 맞춰 동작이 저절로 넘어가는 운동.
 *
 * 세트·횟수를 적는 기존 세션과 목적이 다르다. 챌린지는 **손을 쓰지 않고** 화면과
 * 소리만으로 따라가는 것이라, 이 파일은 "지금 몇 초가 지났는가" 하나로 현재 동작·
 * 남은 시간·다음 동작을 계산하는 순수 함수만 담는다. 타이머·오디오·화면은 호출부.
 */

export interface ChallengeStep {
  /** 화면에 띄울 동작 이름(한국어). */
  name: string
  /** 이 동작을 유지할 시간(초). */
  seconds: number
  /** 카탈로그 운동과 이어지면 시연 이미지를 쓸 수 있다. */
  exerciseId?: string
  /** 자세 힌트 한 줄. */
  hint?: string
  /** 동작이 아니라 쉬는 구간. */
  rest?: boolean
}

export interface Challenge {
  id: string
  name: string
  description?: string
  steps: ChallengeStep[]
  /** 출처 표시(영상 링크 등). */
  source?: string
}

/** 챌린지 총 길이(초). */
export function totalSeconds(challenge: Challenge): number {
  return challenge.steps.reduce((sum, s) => sum + s.seconds, 0)
}

export interface ChallengePosition {
  /** 현재 동작 인덱스. 끝났으면 steps.length. */
  index: number
  step: ChallengeStep | null
  next: ChallengeStep | null
  /** 현재 동작이 끝나기까지 남은 초(올림 — 화면 카운트다운용). */
  remainingInStep: number
  /** 챌린지 전체가 끝나기까지 남은 초. */
  remainingTotal: number
  finished: boolean
}

/**
 * 경과 시간으로 현재 위치를 구한다.
 *
 * 남은 초는 **올림**한다. 3초짜리 동작이 시작된 순간 화면에 "3"이 떠야지 "2"가
 * 뜨면 한 박자 어긋나 보인다. 마지막 순간(경계)에는 다음 동작으로 넘어간다.
 */
export function positionAt(challenge: Challenge, elapsedSec: number): ChallengePosition {
  const total = totalSeconds(challenge)
  const t = Math.max(0, elapsedSec)

  if (t >= total || challenge.steps.length === 0) {
    return {
      index: challenge.steps.length,
      step: null,
      next: null,
      remainingInStep: 0,
      remainingTotal: 0,
      finished: true,
    }
  }

  let acc = 0
  for (let i = 0; i < challenge.steps.length; i++) {
    const step = challenge.steps[i]
    const end = acc + step.seconds
    if (t < end) {
      return {
        index: i,
        step,
        next: challenge.steps[i + 1] ?? null,
        remainingInStep: Math.ceil(end - t),
        remainingTotal: Math.ceil(total - t),
        finished: false,
      }
    }
    acc = end
  }

  // 위 루프에서 반드시 반환된다(t < total 이므로). 방어적으로만 남긴다.
  return {
    index: challenge.steps.length,
    step: null,
    next: null,
    remainingInStep: 0,
    remainingTotal: 0,
    finished: true,
  }
}

/**
 * 이 순간에 울려야 할 신호.
 *
 * 매 프레임 호출되므로 "지금 이 초에 해당하는 신호"만 돌려주고, 같은 초에 두 번
 * 울리지 않게 막는 것은 호출부(직전에 울린 초를 기억)가 한다.
 */
export type ChallengeCue = 'count' | 'switch' | 'finish' | null

export function cueAt(challenge: Challenge, elapsedSec: number): ChallengeCue {
  const total = totalSeconds(challenge)
  if (elapsedSec >= total) return 'finish'

  const pos = positionAt(challenge, elapsedSec)
  if (pos.finished) return 'finish'
  // 동작이 막 바뀐 순간.
  if (pos.remainingInStep === pos.step?.seconds) return 'switch'
  // 남은 3·2·1초 예고.
  if (pos.remainingInStep <= 3) return 'count'
  return null
}

/** `0:45` / `1:05` 형태. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
