/**
 * 운동 → 근육 그룹 매핑.
 *
 * 카탈로그의 `target`/`secondaryMuscles`는 출처가 섞여 있어 표기가 제각각이다
 * (`abs`·`abdominals`·`rectus abdominis`가 모두 복근, `delts`·`deltoids`·
 * `anterior deltoids`가 모두 삼각근). 화면에 칠할 수 있는 건 해부학 도해의
 * 영역이므로, 그 이름들을 먼저 **그리기 가능한 그룹**으로 접는다.
 *
 * 여기서는 이름만 다루고 좌표는 다루지 않는다(도형은 `MuscleMap` 컴포넌트).
 */

/**
 * 그룹 이름은 `react-body-highlighter`(MIT)의 `MuscleType` 값을 그대로 쓴다.
 * 도해를 그 라이브러리가 그리므로, 중간 이름을 따로 두고 변환하면 매핑이 두 겹이
 * 되어 어긋날 자리만 늘어난다.
 */
export const MUSCLE_GROUPS = [
  'head',
  'neck',
  'trapezius',
  'front-deltoids',
  'back-deltoids',
  'chest',
  'upper-back',
  'lower-back',
  'biceps',
  'triceps',
  'forearm',
  'abs',
  'obliques',
  'gluteal',
  'quadriceps',
  'hamstring',
  'calves',
  'adductor',
  'abductors',
  'knees',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

/** 강조 세기 — 주동근은 진하게, 보조근은 옅게 칠한다. */
export type MuscleEmphasis = 'primary' | 'secondary'

export type MuscleActivation = Partial<Record<MuscleGroup, MuscleEmphasis>>

/**
 * 원문 근육명 → 그룹. 키는 소문자로 정규화해서 비교한다.
 *
 * 카탈로그에 실제로 등장하는 표기를 모두 담았다(주동근 39종 + 보조근 76종).
 * 여기 없는 이름은 조용히 버린다 — 잘못된 부위를 칠하는 것보다 안 칠하는 게 낫다.
 *
 * 의도적으로 뺀 값(카탈로그 전수 대조로 확인): `cardiovascular system`,
 * `full body`는 특정 부위가 아니고, `ankles`/`ankle stabilizers`는 도해에 없는
 * 관절이며, `varies by machine`류는 값 자체가 미정이다. 이런 운동은 근육맵 대신
 * `isWholeBody`로 걸러 별도 문구를 보여준다.
 */
const MUSCLE_ALIASES: Record<string, MuscleGroup> = {
  // 목
  neck: 'neck',
  'neck flexors': 'neck',
  sternocleidomastoid: 'neck',
  scalenes: 'neck',

  // 승모근
  traps: 'trapezius',
  trapezius: 'trapezius',
  'upper trapezius': 'trapezius',
  'middle trapezius': 'trapezius',
  'lower trapezius': 'trapezius',

  // 어깨 — 도해가 전면/후면을 나눠 그리므로 표기에 방향이 있으면 살린다.
  // 방향이 없는 `delts`류는 앞뒤 모두 칠하도록 뒤에서 확장한다.
  delts: 'front-deltoids',
  deltoids: 'front-deltoids',
  shoulders: 'front-deltoids',
  'anterior deltoid': 'front-deltoids',
  'anterior deltoids': 'front-deltoids',
  'posterior deltoid': 'back-deltoids',
  'posterior deltoids': 'back-deltoids',
  'rear deltoids': 'back-deltoids',
  'rotator cuff': 'back-deltoids',
  infraspinatus: 'back-deltoids',

  // 가슴
  pectorals: 'chest',
  'pectoralis major': 'chest',
  chest: 'chest',
  'upper chest': 'chest',
  'upper pectorals': 'chest',
  'serratus anterior': 'chest',
  intercostals: 'chest',

  // 등 — 도해에 광배근 영역이 따로 없어 상부 등에 함께 넣는다.
  lats: 'upper-back',
  'latissimus dorsi': 'upper-back',
  'upper back': 'upper-back',
  'middle back': 'upper-back',
  rhomboids: 'upper-back',
  rhoboids: 'upper-back', // 카탈로그 원문의 오타
  'teres major': 'upper-back',

  // 하부 등
  'lower back': 'lower-back',
  'erector spinae': 'lower-back',
  erectors: 'lower-back',
  'spinal erectors': 'lower-back',
  spine: 'lower-back',
  'thoracic spine': 'lower-back',
  'quadratus lumborum': 'lower-back',

  // 팔
  biceps: 'biceps',
  'biceps brachii': 'biceps',
  brachialis: 'biceps',
  triceps: 'triceps',
  'triceps brachii': 'triceps',
  anconeus: 'triceps',
  forearms: 'forearm',
  'forearm extensors': 'forearm',
  brachioradialis: 'forearm',
  'flexor carpi radialis': 'forearm',
  'flexor carpi ulnaris': 'forearm',

  // 코어
  abs: 'abs',
  abdominals: 'abs',
  'rectus abdominis': 'abs',
  'lower abs': 'abs',
  'lower abdominals': 'abs',
  'transverse abdominis': 'abs',
  core: 'abs',
  'core stabilizers': 'abs',
  obliques: 'obliques',

  // 엉덩이·다리
  glutes: 'gluteal',
  'gluteus maximus': 'gluteal',
  'gluteus medius': 'gluteal',
  'gluteus minimus': 'gluteal',
  piriformis: 'gluteal',
  quads: 'quadriceps',
  quadriceps: 'quadriceps',
  'rectus femoris': 'quadriceps',
  'vastus medialis': 'quadriceps',
  'hip flexors': 'quadriceps',
  iliopsoas: 'quadriceps',
  'tensor fasciae latae': 'quadriceps',
  hamstrings: 'hamstring',
  calves: 'calves',
  gastrocnemius: 'calves',
  soleus: 'calves',
  peroneals: 'calves',
  'tibialis anterior': 'calves',
  'tibialis posterior': 'calves',
  'achilles tendon': 'calves',
  adductors: 'adductor',
  groin: 'adductor',
  abductors: 'abductors',
  'hip abductors': 'abductors',
}

/**
 * 방향이 명시되지 않은 어깨 표기는 앞뒤 삼각근을 모두 칠한다 — `delts`만 적힌
 * 운동에서 한쪽만 칠하면 실제보다 좁게 읽힌다.
 */
const BOTH_DELTOIDS = new Set(['delts', 'deltoids', 'shoulders'])

/** 근육 이름 하나를 그룹으로. 모르는 이름이면 null. */
export function toMuscleGroup(name: string): MuscleGroup | null {
  return MUSCLE_ALIASES[name.trim().toLowerCase()] ?? null
}

interface ExerciseLike {
  target?: string
  secondaryMuscles?: string[]
}

/** 특정 부위가 아니라 전신/심폐를 쓰는 운동인지(러닝·로잉 등). */
const WHOLE_BODY_TARGETS = new Set(['cardiovascular system', 'full body'])

export function isWholeBody(exercise: ExerciseLike): boolean {
  return WHOLE_BODY_TARGETS.has((exercise.target ?? '').trim().toLowerCase())
}

/**
 * 운동 목록에서 활성 근육을 모은다.
 *
 * 한 그룹이 어떤 운동에선 주동근, 다른 운동에선 보조근이면 **주동근이 이긴다** —
 * 루틴 전체를 한 장으로 볼 때 "오늘 주로 쓰는 부위"가 흐려지면 안 된다.
 */
/** 이름 하나가 칠할 그룹들(어깨는 방향이 없으면 앞뒤 둘 다). */
function groupsOf(name: string): MuscleGroup[] {
  const g = toMuscleGroup(name)
  if (!g) return []
  if (BOTH_DELTOIDS.has(name.trim().toLowerCase())) return ['front-deltoids', 'back-deltoids']
  return [g]
}

export function activationFor(exercises: ExerciseLike[]): MuscleActivation {
  const result: MuscleActivation = {}

  for (const ex of exercises) {
    for (const sec of ex.secondaryMuscles ?? []) {
      for (const g of groupsOf(sec)) {
        if (!result[g]) result[g] = 'secondary'
      }
    }
  }
  // 주동근을 나중에 얹어 보조근 표시를 덮는다.
  for (const ex of exercises) {
    for (const g of groupsOf(ex.target ?? '')) {
      result[g] = 'primary'
    }
  }

  return result
}

const GROUP_KO: Record<MuscleGroup, string> = {
  head: '머리',
  neck: '목',
  trapezius: '승모근',
  'front-deltoids': '전면 어깨',
  'back-deltoids': '후면 어깨',
  chest: '가슴',
  'upper-back': '등',
  'lower-back': '척추기립근',
  biceps: '이두',
  triceps: '삼두',
  forearm: '전완',
  abs: '복근',
  obliques: '복사근',
  gluteal: '둔근',
  quadriceps: '대퇴사두',
  hamstring: '햄스트링',
  calves: '종아리',
  adductor: '내전근',
  abductors: '외전근',
  knees: '무릎',
}

export function muscleGroupKo(group: MuscleGroup): string {
  return GROUP_KO[group]
}

/** 활성 근육을 "가슴, 삼두 · 어깨" 식으로 요약(주동근 먼저). */
export function summarizeActivation(activation: MuscleActivation): string {
  const primary = MUSCLE_GROUPS.filter((g) => activation[g] === 'primary')
  const secondary = MUSCLE_GROUPS.filter((g) => activation[g] === 'secondary')
  const head = primary.map(muscleGroupKo).join(', ')
  const tail = secondary.map(muscleGroupKo).join(', ')
  if (!head) return tail
  if (!tail) return head
  return `${head} · ${tail}`
}
