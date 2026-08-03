/**
 * 앱이 제안하는 루틴.
 *
 * 사용자가 만든 루틴(`Routine`)과 다른 타입인 이유는 **목표 횟수를 담기 때문**
 * 이다. `Routine`은 운동 목록과 휴식만 갖고 있어서 "푸시업 12회"의 12를 둘 곳이
 * 없다. 시작하면 그 목표가 세트에 미리 채워지고, 그때부터는 평범한 세션이다.
 *
 * 챌린지(`challenges.ts`)와도 다르다 — 챌린지는 초에 맞춰 저절로 넘어가고,
 * 이쪽은 자기 속도로 하고 직접 체크한다.
 */

export interface RecommendedItem {
  /** 카탈로그 운동 id. */
  exerciseId: string
  /** 카탈로그에 없거나 이름을 달리 부르고 싶을 때. */
  displayName?: string
  /** 목표 세트 수(기본 1). */
  sets?: number
  /** 세트당 목표 횟수. */
  reps?: number
  /** 시간으로 하는 운동의 목표 시간(초). */
  durationSec?: number
  /** "다리당 10회"처럼 숫자만으로 부족한 설명. */
  note?: string
}

export interface RecommendedRoutine {
  id: string
  name: string
  description?: string
  /** 출처 표기(가져온 곳이 있으면). */
  source?: string
  sourceLabel?: string
  items: RecommendedItem[]
}

export const RECOMMENDED_ROUTINES: RecommendedRoutine[] = [
  {
    id: 'bodyweight-starter',
    name: '맨몸 기본 루틴',
    description: '기구 없이 집에서. 상체·코어·하체를 한 바퀴 도는 구성이에요.',
    sourceLabel: '@just_pullups',
    items: [
      { exerciseId: 'drv-push-ups', reps: 12, note: '가슴·어깨·삼두' },
      { exerciseId: 'drv-sit-ups', reps: 25, note: '복부 근력' },
      {
        exerciseId: 'yo-bodyweight-walking-lunge',
        reps: 20,
        note: '다리당 10회씩',
      },
      { exerciseId: 'drv-squat', reps: 25, note: '하체 전반' },
      { exerciseId: 'new-low-impact-jumping-jack', reps: 50, note: '전신·코어 안정화' },
      { exerciseId: 'fitlog-wall-sit', durationSec: 60, note: '허벅지·코어 지구력' },
    ],
  },
]

export function findRecommendedRoutine(id: string): RecommendedRoutine | undefined {
  return RECOMMENDED_ROUTINES.find((r) => r.id === id)
}
