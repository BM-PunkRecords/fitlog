import { useMemo, useState } from 'react'
import { searchExercises } from '../catalog/searchExercises'
import type { Exercise } from '../catalog/types'

interface Props {
  catalog: Exercise[]
  onPick: (exercise: Exercise) => void
  excludeIds?: string[]
}

export function ExercisePicker({ catalog, onPick, excludeIds = [] }: Props) {
  const [query, setQuery] = useState('')
  const [bodyPart, setBodyPart] = useState('')

  const bodyParts = useMemo(
    () => [...new Set(catalog.map((e) => e.bodyPart))].sort(),
    [catalog],
  )

  const results = useMemo(() => {
    const excluded = new Set(excludeIds)
    return searchExercises(catalog, query, bodyPart ? { bodyPart } : {}).filter(
      (e) => !excluded.has(e.id),
    )
  }, [catalog, query, bodyPart, excludeIds])

  return (
    <div className="stack">
      <input
        className="field"
        placeholder="운동 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        className="field"
        value={bodyPart}
        onChange={(e) => setBodyPart(e.target.value)}
        aria-label="부위 필터"
      >
        <option value="">전체 부위</option>
        {bodyParts.map((part) => (
          <option key={part} value={part}>
            {part}
          </option>
        ))}
      </select>
      <div className="stack" style={{ maxHeight: 320, overflow: 'auto' }}>
        {results.slice(0, 40).map((ex) => (
          <button
            key={ex.id}
            type="button"
            className="card row"
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => onPick(ex)}
          >
            <img
              className="thumb"
              src={ex.thumbnails.male ?? ex.thumbnails.female}
              alt=""
              loading="lazy"
            />
            <div>
              <div>{ex.name}</div>
              <div className="muted">
                {ex.target} · {ex.equipment}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
