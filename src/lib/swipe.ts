/**
 * 세션 화면 좌우 스와이프 판정 — 순수 함수.
 *
 * 운동 기록 화면은 세로로 길게 스크롤되고 숫자 입력이 촘촘히 놓여 있다. 그래서
 * "가로로 움직였다"만으로 운동을 넘기면 스크롤 도중이나 입력값을 드래그 선택하는
 * 중에 화면이 튄다. 판정은 아래 네 조건을 **모두** 만족할 때만 성립한다.
 *
 *   1. 가로 이동이 임계값 이상        — 실수로 스친 것과 구분
 *   2. 가로가 세로보다 뚜렷하게 우세  — 대각선/세로 스크롤 제외
 *   3. 제한 시간 안에 끝난 동작       — 길게 끄는 드래그/선택 제외
 *   4. 손가락 하나                    — 핀치 줌 제외
 *
 * 실제 DOM/터치 이벤트는 호출부가 다루고, 여기서는 좌표만 받는다.
 */

export interface SwipePoint {
  x: number
  y: number
  t: number
}

export type SwipeDirection = 'prev' | 'next' | null

export interface SwipeOptions {
  /** 스와이프로 인정할 최소 가로 이동(px). */
  minDistance?: number
  /** 가로 이동이 세로 이동의 몇 배 이상이어야 하는지. */
  ratio?: number
  /** 이 시간(ms)을 넘긴 동작은 스와이프로 보지 않는다. */
  maxDuration?: number
}

export const SWIPE_MIN_DISTANCE = 56
export const SWIPE_RATIO = 1.6
export const SWIPE_MAX_DURATION = 700

export function detectSwipe(
  start: SwipePoint,
  end: SwipePoint,
  options: SwipeOptions = {},
): SwipeDirection {
  const {
    minDistance = SWIPE_MIN_DISTANCE,
    ratio = SWIPE_RATIO,
    maxDuration = SWIPE_MAX_DURATION,
  } = options

  const dx = end.x - start.x
  const dy = end.y - start.y
  const duration = end.t - start.t

  if (duration < 0 || duration > maxDuration) return null
  if (Math.abs(dx) < minDistance) return null
  if (Math.abs(dx) < Math.abs(dy) * ratio) return null

  // 왼쪽으로 밀면 다음 운동이 따라 들어온다(캐러셀과 같은 방향 감각).
  return dx < 0 ? 'next' : 'prev'
}

/**
 * 이 요소 위에서 시작한 제스처는 스와이프로 보지 않는다.
 *
 * 입력/선택 컨트롤은 값을 드래그 선택하거나 슬라이드로 조작하고, 스크롤 컨테이너와
 * 미디어는 자체 가로 제스처를 가진다. 여기서 시작한 동작까지 가로채면 그 컨트롤이
 * 망가진다.
 */
export function isSwipeExempt(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'input, select, textarea, video, audio, [contenteditable="true"], [data-no-swipe]',
    ),
  )
}
