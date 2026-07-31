import Model, { type IExerciseData } from 'react-body-highlighter'
import {
  MUSCLE_GROUPS,
  type MuscleActivation,
  type MuscleGroup,
  muscleGroupKo,
} from '../lib/muscleMap'

/**
 * 앞/뒤 인체 도해에 사용 부위를 칠해 보여준다.
 *
 * 도해는 `react-body-highlighter`(MIT)가 그린다. 직접 그린 단순 실루엣을 쓰다가
 * 교체했다 — 해부학적 형태가 비교가 안 되게 정확하고, 근육 영역도 23종으로 더
 * 잘게 나뉜다. 우리 쪽은 카탈로그 표기를 그 라이브러리의 `MuscleType`으로 접는
 * 매핑(`lib/muscleMap.ts`)만 유지한다.
 *
 * 강조 세기는 라이브러리의 `frequency`로 표현한다. 이 컴포넌트는 빈도를 세는 게
 * 아니라 주동/보조 두 단계만 쓰므로, `highlightedColors[0]`=보조, `[1]`=주동으로
 * 두고 주동근에 frequency 2를 준다.
 */

interface Props {
  activation: MuscleActivation
  /** 전신/유산소 운동이라 특정 부위를 칠할 수 없을 때 */
  wholeBody?: boolean
  className?: string
}

/** 주동/보조를 각각 한 덩어리로 넘긴다(라이브러리는 운동 단위 배열을 받는다). */
function toModelData(activation: MuscleActivation): IExerciseData[] {
  const pick = (level: 'primary' | 'secondary') =>
    MUSCLE_GROUPS.filter((g) => activation[g] === level)

  const secondary = pick('secondary')
  const primary = pick('primary')
  const data: IExerciseData[] = []

  if (secondary.length) {
    data.push({ name: '보조', muscles: [...secondary], frequency: 1 })
  }
  if (primary.length) {
    data.push({ name: '주동', muscles: [...primary], frequency: 2 })
  }
  return data
}

export function MuscleMap({ activation, wholeBody = false, className = '' }: Props) {
  const data = toModelData(activation)
  const listed = (level: 'primary' | 'secondary') =>
    MUSCLE_GROUPS.filter((g) => activation[g] === level).map(muscleGroupKo)

  const primaryNames = listed('primary')
  const secondaryNames = listed('secondary')
  const empty = primaryNames.length === 0 && secondaryNames.length === 0

  // 라이브러리 색은 CSS 변수를 못 읽으므로(인라인 fill로 들어간다) 앱 팔레트와
  // 맞춘 값을 직접 준다. 세 단계가 서로, 그리고 카드 배경(#17302b)과 구분돼야
  // 한다 — 비활성 몸이 배경에 묻히면 어디를 쓰는지가 아니라 사람 형태 자체가
  // 안 보인다(초기값 #222c26은 배경 대비 1.03이라 사실상 투명했다).
  //
  // 비활성은 라임에서 채도를 뺀 슬레이트-그린이라 색상만으로도 활성과 갈린다.
  const bodyColor = '#33544c' // 배경 대비 1.68 — 형태는 보이되 뒤로 물러난다
  const highlightedColors = [
    '#79b53a', // 보조: 비활성 대비 3.38
    '#c6f57e', // 주동: 보조 대비 1.98, 비활성 대비 6.67
  ]

  return (
    <div className={`muscle-map ${className}`.trim()}>
      <div className="muscle-figures">
        <figure className="muscle-figure">
          <Model
            data={data}
            type="anterior"
            bodyColor={bodyColor}
            highlightedColors={highlightedColors}
          />
          <figcaption className="muted muscle-caption">앞면</figcaption>
        </figure>
        <figure className="muscle-figure">
          <Model
            data={data}
            type="posterior"
            bodyColor={bodyColor}
            highlightedColors={highlightedColors}
          />
          <figcaption className="muted muscle-caption">뒷면</figcaption>
        </figure>
      </div>

      {/* 도해는 색으로만 말한다 — 부위 이름을 글로도 적는다. */}
      {empty ? (
        <p className="muted muscle-summary">
          {wholeBody ? '전신을 쓰는 운동이에요.' : '부위 정보가 없어요.'}
        </p>
      ) : (
        <p className="muscle-summary">
          {primaryNames.length > 0 && (
            <>
              <span className="muscle-legend-dot is-primary" aria-hidden />
              <span>{primaryNames.join(', ')}</span>
            </>
          )}
          {secondaryNames.length > 0 && (
            <>
              <span className="muscle-legend-dot is-secondary" aria-hidden />
              <span className="muted">{secondaryNames.join(', ')}</span>
            </>
          )}
        </p>
      )}
    </div>
  )
}

export type { MuscleGroup }
