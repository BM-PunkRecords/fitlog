import Model from 'react-body-highlighter'
import type { MuscleGroup } from '../lib/muscleMap'

/**
 * 커스텀 운동을 만들 때 "부위"를 **그림으로** 고르게 한다.
 *
 * 부위·주 근육을 영어 드롭다운(가슴=pectorals?)에서 고르는 건 운동 용어를 모르면
 * 막막하다. 대신 인체 도해에 부위를 칠한 카드를 늘어놓고 눌러서 고른다 — 어디를
 * 쓰는 운동인지 보고 짚으면 된다. 카드 하나가 카탈로그의 `bodyPart`와 대표
 * `target`을 함께 정해준다(세부 근육까지 고르게 하지 않는다 — 그게 어려운 지점이다).
 */

export interface BodyRegion {
  key: string
  label: string
  /** 카탈로그 bodyPart 값 */
  bodyPart: string
  /** 카탈로그 target 값(대표 근육) */
  target: string
  view: 'anterior' | 'posterior'
  /** 카드 도해에 칠할 근육 그룹 */
  muscles: MuscleGroup[]
  /** 특정 부위가 아닌 전신/유산소 */
  wholeBody?: boolean
}

export const BODY_REGIONS: BodyRegion[] = [
  { key: 'chest', label: '가슴', bodyPart: 'chest', target: 'pectorals', view: 'anterior', muscles: ['chest'] },
  { key: 'back', label: '등', bodyPart: 'back', target: 'lats', view: 'posterior', muscles: ['upper-back'] },
  { key: 'shoulders', label: '어깨', bodyPart: 'shoulders', target: 'delts', view: 'anterior', muscles: ['front-deltoids', 'back-deltoids'] },
  { key: 'biceps', label: '이두(앞팔)', bodyPart: 'upper arms', target: 'biceps', view: 'anterior', muscles: ['biceps'] },
  { key: 'triceps', label: '삼두(뒷팔)', bodyPart: 'upper arms', target: 'triceps', view: 'posterior', muscles: ['triceps'] },
  { key: 'abs', label: '복근', bodyPart: 'waist', target: 'abs', view: 'anterior', muscles: ['abs'] },
  { key: 'quads', label: '허벅지 앞', bodyPart: 'upper legs', target: 'quadriceps', view: 'anterior', muscles: ['quadriceps'] },
  { key: 'hamstrings', label: '허벅지 뒤', bodyPart: 'upper legs', target: 'hamstrings', view: 'posterior', muscles: ['hamstring'] },
  { key: 'glutes', label: '엉덩이', bodyPart: 'hips', target: 'glutes', view: 'posterior', muscles: ['gluteal'] },
  { key: 'calves', label: '종아리', bodyPart: 'lower legs', target: 'calves', view: 'posterior', muscles: ['calves'] },
  { key: 'forearms', label: '전완(아래팔)', bodyPart: 'lower arms', target: 'forearms', view: 'anterior', muscles: ['forearm'] },
  { key: 'cardio', label: '유산소·전신', bodyPart: 'cardio', target: 'cardiovascular system', view: 'anterior', muscles: [], wholeBody: true },
]

/** preferBodyPart 등 카탈로그 bodyPart로 맞는 지역을 찾는다. */
export function regionForBodyPart(bodyPart: string | undefined): BodyRegion | undefined {
  if (!bodyPart) return undefined
  return BODY_REGIONS.find((r) => r.bodyPart === bodyPart)
}

// MuscleMap과 같은 팔레트 — 비활성 몸은 뒤로 물러나고 칠한 부위만 라임으로 뜬다.
const BODY_COLOR = '#33544c'
const HIGHLIGHT = ['#c6f57e']

interface Props {
  value: string
  onSelect: (region: BodyRegion) => void
}

export function BodyPartPicker({ value, onSelect }: Props) {
  return (
    <div className="bodypart-grid" role="radiogroup" aria-label="운동 부위 선택">
      {BODY_REGIONS.map((region) => {
        const selected = region.key === value
        const data = region.muscles.length
          ? [{ name: region.label, muscles: [...region.muscles], frequency: 1 }]
          : []
        return (
          <button
            key={region.key}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`bodypart-card ${selected ? 'is-selected' : ''}`}
            onClick={() => onSelect(region)}
          >
            <span className="bodypart-figure" aria-hidden>
              <Model
                data={data}
                type={region.view}
                bodyColor={BODY_COLOR}
                highlightedColors={HIGHLIGHT}
              />
            </span>
            <span className="bodypart-label">{region.label}</span>
          </button>
        )
      })}
    </div>
  )
}
