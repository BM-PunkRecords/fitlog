import {
  type MuscleActivation,
  type MuscleGroup,
  muscleGroupKo,
  summarizeActivation,
} from '../lib/muscleMap'

/**
 * 앞/뒤 인체 도해에 활성 근육을 칠해 보여준다.
 *
 * 도해는 이 파일 안에서 직접 그린 단순화 실루엣이다 — 시판 피트니스 앱의 사실적인
 * 해부 일러스트는 저작권이 있어 쓸 수 없다. 목표는 해부학 교재 수준의 정밀함이
 * 아니라 **어느 부위를 쓰는지 한눈에 읽히는 것**이라, 근육을 알아볼 수 있는 최소
 * 형태로 단순화했다.
 *
 * 좌표계는 100×200 viewBox이고 정중선은 x=50이다. 좌우 대칭인 근육은 같은 도형을
 * `scale(-1,1)`로 미러링해 한 번만 정의한다.
 */

interface Props {
  activation: MuscleActivation
  /** 전신/유산소 운동이라 특정 부위를 칠할 수 없을 때 */
  wholeBody?: boolean
  className?: string
}

type Shape = { d: string; mirror?: boolean }

/**
 * 인체 외곽 — 머리/목/몸통/팔/다리를 각각 그린다.
 *
 * 하나의 긴 path 대신 부위별로 나눈 이유: 근육 좌표를 팔·다리 위치에 맞추기
 * 쉽고, 같은 도형을 clipPath로 재사용해 **근육이 몸 밖으로 새어나가지 않도록**
 * 가둘 수 있다. 팔은 몸통에서 살짝 벌려 팔 근육이 보이게 두었다.
 */
const BODY: Shape[] = [
  { d: 'M50 5 q9 0 9 11 q0 8 -4 12 h-10 q-4 -4 -4 -12 q0 -11 9 -11 z' }, // 머리
  { d: 'M45 26 h10 v8 h-10 z' }, // 목
  // 몸통 — 어깨에서 허리로 좁아졌다가 골반에서 다시 벌어진다. 골반은 엉덩이가
  // 들어갈 만큼 아래로 내려와 다리 위쪽과 겹친다(둘 사이에 틈이 생기면 그 틈에서
  // 근육이 clip에 잘린다).
  {
    d:
      'M36 33 h28 q5 0 6 6 l2 15 q1 6 -1 11 l-2 13 q-1 5 -1 9 l1 12 q1 9 -4 9 h-32 ' +
      'q-5 0 -4 -9 l1 -12 q0 -4 -1 -9 l-2 -13 q-2 -5 -1 -11 l2 -15 q1 -6 6 -6 z',
  },
  // 팔 — 어깨에서 손끝까지. 몸통과 붙지 않게 살짝 띄운다.
  {
    d: 'M34 35 q-8 2 -10 9 l-5 28 q-1 5 -2 9 l-3 21 q-1 6 3 7 q5 1 6 -5 l4 -22 q1 -5 3 -9 l7 -27 z',
    mirror: true,
  },
  // 다리 — 허벅지에서 발까지. 위쪽은 몸통 골반과 겹치게 시작한다.
  {
    d:
      'M37 99 q-5 1 -5 7 l1 30 q0 6 1 11 l2 31 q1 6 -1 10 q4 2 8 0 q2 -5 2 -11 ' +
      'l1 -30 q1 -6 1 -12 l2 -29 q0 -6 -4 -7 z',
    mirror: true,
  },
]

/** 앞에서 보이는 근육. 왼쪽 절반만 그리고 대칭은 mirror로 처리한다. */
const FRONT: Partial<Record<MuscleGroup, Shape[]>> = {
  neck: [{ d: 'M45 26 h10 v8 h-10 z' }],
  traps: [{ d: 'M37 34 q-2 4 -1 7 l12 -3 v-4 z', mirror: true }],
  shoulders: [{ d: 'M34 35 q-9 2 -11 10 q-1 5 1 7 q4 -9 12 -12 z', mirror: true }],
  chest: [{ d: 'M49 39 h-11 q-4 5 -4 10 q0 5 3 7 q6 2 12 -1 z', mirror: true }],
  biceps: [{ d: 'M23 53 q-3 6 -4 12 l-2 9 q3 3 7 1 l2 -10 q1 -6 3 -11 z', mirror: true }],
  forearms: [{ d: 'M16 78 q-2 7 -3 13 l-2 12 q3 3 7 1 l2 -13 q1 -6 3 -12 z', mirror: true }],
  abs: [{ d: 'M49 59 h-7 v27 h7 z', mirror: true }],
  obliques: [{ d: 'M41 60 q-6 2 -7 9 l-1 10 q0 5 3 8 l4 -12 z', mirror: true }],
  quads: [{ d: 'M48 102 h-10 q-5 5 -5 14 l1 20 q1 8 4 12 q6 2 9 -2 l1 -24 z', mirror: true }],
  adductors: [{ d: 'M49 102 h-6 q-3 5 -3 12 l0 14 q3 4 6 2 l3 -14 z', mirror: true }],
  abductors: [{ d: 'M37 101 q-5 2 -5 9 l0 11 q3 3 5 0 l1 -12 z', mirror: true }],
  calves: [{ d: 'M45 149 h-8 q-4 6 -4 14 l1 15 q1 6 3 9 q5 1 8 -2 l0 -18 z', mirror: true }],
}

/** 뒤에서 보이는 근육. */
const BACK: Partial<Record<MuscleGroup, Shape[]>> = {
  neck: [{ d: 'M45 26 h10 v8 h-10 z' }],
  traps: [{ d: 'M50 34 h-13 q-3 5 -2 10 l3 12 q6 -5 12 -7 z', mirror: true }],
  shoulders: [{ d: 'M34 35 q-9 2 -11 10 q-1 5 1 7 q4 -9 12 -12 z', mirror: true }],
  upperBack: [{ d: 'M50 45 h-11 q-2 4 -1 8 l12 -3 z', mirror: true }],
  lats: [{ d: 'M50 55 h-11 q-5 4 -6 11 l-1 12 q0 5 3 8 l15 -9 z', mirror: true }],
  lowerBack: [{ d: 'M50 62 h-7 v24 h7 z', mirror: true }],
  triceps: [{ d: 'M23 52 q-4 6 -5 13 l-2 9 q3 3 7 1 l2 -10 q1 -6 4 -12 z', mirror: true }],
  forearms: [{ d: 'M16 78 q-2 7 -3 13 l-2 12 q3 3 7 1 l2 -13 q1 -6 3 -12 z', mirror: true }],
  glutes: [{ d: 'M50 91 h-11 q-6 2 -6 10 q0 8 6 10 q7 1 11 -3 z', mirror: true }],
  hamstrings: [{ d: 'M48 114 h-10 q-5 4 -5 12 l1 16 q1 6 4 9 q6 2 9 -2 l1 -21 z', mirror: true }],
  calves: [{ d: 'M45 150 h-8 q-4 6 -4 14 l1 15 q1 6 3 9 q5 1 8 -2 l0 -18 z', mirror: true }],
}

/** 도형 하나 + (대칭이면) 그 거울상. */
function ShapePair({ shape }: { shape: Shape }) {
  return (
    <>
      <path d={shape.d} />
      {shape.mirror && <path d={shape.d} transform="translate(100,0) scale(-1,1)" />}
    </>
  )
}

function Figure({
  shapes,
  activation,
  label,
}: {
  shapes: Partial<Record<MuscleGroup, Shape[]>>
  activation: MuscleActivation
  label: string
}) {
  return (
    <figure className="muscle-figure">
      <svg viewBox="0 0 100 200" className="muscle-svg" role="img" aria-label={label}>
        <g className="muscle-body">
          {BODY.map((shape, i) => (
            <ShapePair key={i} shape={shape} />
          ))}
        </g>

        {/* 근육 도형은 실루엣 안에 들어가도록 좌표로 맞춘다.
            clipPath로 가두는 방법은 쓰지 않는다 — 실루엣이 몸통·팔·다리로 겹쳐
            그려져 있어 렌더러에 따라 겹친 영역이 상쇄되어 구멍이 뚫린다(cairosvg
            에서 실제로 재현: 엉덩이 한쪽이 잘림). 겹침에 안전한 쪽을 택했다. */}
        {(Object.keys(shapes) as MuscleGroup[]).map((group) => {
          const emphasis = activation[group]
          if (!emphasis) return null
          return (
            <g key={group} className={`muscle-part is-${emphasis}`}>
              {shapes[group]?.map((shape, i) => (
                <ShapePair key={i} shape={shape} />
              ))}
            </g>
          )
        })}
      </svg>
      <figcaption className="muted muscle-caption">{label}</figcaption>
    </figure>
  )
}

export function MuscleMap({ activation, wholeBody = false, className = '' }: Props) {
  const summary = summarizeActivation(activation)
  const active = (Object.keys(activation) as MuscleGroup[]).filter((g) => activation[g])

  return (
    <div className={`muscle-map ${className}`.trim()}>
      <div className="muscle-figures">
        <Figure shapes={FRONT} activation={activation} label="앞면" />
        <Figure shapes={BACK} activation={activation} label="뒷면" />
      </div>

      {/* 색만으로 정보를 주지 않는다 — 이름을 같이 적는다. */}
      {wholeBody && active.length === 0 ? (
        <p className="muted muscle-summary">전신을 쓰는 운동이에요.</p>
      ) : summary ? (
        <p className="muscle-summary">
          <span className="muscle-legend-dot is-primary" aria-hidden />
          {active
            .filter((g) => activation[g] === 'primary')
            .map(muscleGroupKo)
            .join(', ') || '—'}
          {active.some((g) => activation[g] === 'secondary') && (
            <>
              <span className="muscle-legend-dot is-secondary" aria-hidden />
              <span className="muted">
                {active
                  .filter((g) => activation[g] === 'secondary')
                  .map(muscleGroupKo)
                  .join(', ')}
              </span>
            </>
          )}
        </p>
      ) : (
        <p className="muted muscle-summary">부위 정보가 없어요.</p>
      )}
    </div>
  )
}
