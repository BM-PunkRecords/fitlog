import { useMemo, useState } from 'react'
import { searchExercises } from '../catalog/searchExercises'
import type { Exercise } from '../catalog/types'
import { bodyPartKo, equipmentKo, targetKo } from '../lib/labelsKo'
import { tKo } from '../lib/tKo'
import { ExercisePreview } from './ExercisePreview'

interface Props {
  catalog: Exercise[]
  onPick: (exercise: Exercise) => void
  excludeIds?: string[]
  /** Prefer same body part first when replacing */
  preferBodyPart?: string
}

export function ExercisePicker({
  catalog,
  onPick,
  excludeIds = [],
  preferBodyPart,
}: Props) {
  const [query, setQuery] = useState('')
  const [bodyPart, setBodyPart] = useState(preferBodyPart ?? '')
  const [equipment, setEquipment] = useState('')

  const bodyParts = useMemo(
    () => [...new Set(catalog.map((e) => e.bodyPart))].sort(),
    [catalog],
  )
  const equipments = useMemo(
    () => [...new Set(catalog.map((e) => e.equipment))].sort(),
    [catalog],
  )

  const results = useMemo(() => {
    const excluded = new Set(excludeIds)
    return searchExercises(catalog, query, {
      bodyPart: bodyPart || undefined,
      equipment: equipment || undefined,
    }).filter((e) => !excluded.has(e.id))
  }, [catalog, query, bodyPart, equipment, excludeIds])

  return (
    <div className="exercise-picker">
      <input
        className="field"
        placeholder="운동 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="row">
        <select
          className="field"
          value={bodyPart}
          onChange={(e) => setBodyPart(e.target.value)}
          aria-label="부위 필터"
          style={{ flex: 1 }}
        >
          <option value="">전체 부위</option>
          {bodyParts.map((part) => (
            <option key={part} value={part}>
              {bodyPartKo(part)}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          aria-label="장비 필터"
          style={{ flex: 1 }}
        >
          <option value="">전체 장비</option>
          {equipments.map((eq) => (
            <option key={eq} value={eq}>
              {equipmentKo(eq)}
            </option>
          ))}
        </select>
      </div>
      <div className="exercise-picker-list stack">
        {results.slice(0, 40).map((ex) => (
          <button
            key={ex.id}
            type="button"
            className="card row"
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => onPick(ex)}
          >
            <ExercisePreview exercise={ex} media="image" />
            <div>
              <div>{tKo(ex.name)}</div>
              <div className="muted">
                {targetKo(ex.target)} · {equipmentKo(ex.equipment)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
