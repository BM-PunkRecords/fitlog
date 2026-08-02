import type { Challenge } from '../lib/challenge'

/**
 * 내장 챌린지 정의.
 *
 * 화면·타이머 코드와 떨어뜨려 둔 이유는 **동작 구성이 자주 바뀌기 때문**이다.
 * 영상을 보고 순서나 초를 고칠 때 이 파일의 `steps`만 손대면 되고, 재생 로직은
 * 건드릴 필요가 없다.
 *
 * `seconds` 합계가 곧 챌린지 길이다. `exerciseId`를 채우면 카탈로그의 시연
 * 이미지가 함께 뜨고, 비워 두면 이름과 힌트만 보여준다.
 */
export const CHALLENGES: Challenge[] = [
  {
    id: 'abs-1min',
    name: '1분 복근 챌린지',
    description: '쉬는 구간 없이 1분. 동작이 12초마다 바뀐다.',
    // "1 min Abs challenge at home" — fitnessfreak67
    youtubeId: 'wJoOk3WCBGc',
    portrait: true, // 숏츠(세로)
    source: 'https://youtube.com/shorts/wJoOk3WCBGc',
    // ⚠️ 임시 구성 — 영상에서 확인한 순서·시간으로 교체할 것.
    steps: [
      { name: '마운틴 클라이머', seconds: 12, hint: '무릎을 가슴으로 빠르게 번갈아' },
      { name: '플랭크 잭', seconds: 12, hint: '플랭크 자세로 두 발을 벌렸다 모으기' },
      { name: '사이드 탭', seconds: 12, hint: '무릎을 옆구리 쪽으로 번갈아' },
      { name: '크로스 탭', seconds: 12, hint: '무릎을 대각선으로 교차' },
      { name: '마운틴 클라이머', seconds: 12, hint: '마지막은 더 빠르게' },
    ],
  },
  {
    id: 'plank-challenge',
    name: '플랭크 챌린지',
    description: '동작을 외워서 따라가는 플랭크 시퀀스.',
    // ⚠️ 자리만 잡아 둔 상태 — 영상의 동작 순서·시간을 받아 채울 것.
    steps: [
      { name: '기본 플랭크', seconds: 20, hint: '팔꿈치는 어깨 아래, 허리는 일직선' },
      { name: '사이드 플랭크(좌)', seconds: 20, hint: '골반을 아래로 떨어뜨리지 않기' },
      { name: '사이드 플랭크(우)', seconds: 20, hint: '반대쪽도 같은 자세로' },
    ],
  },
]

export function findChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id)
}
