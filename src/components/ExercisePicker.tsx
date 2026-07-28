import { useEffect, useMemo, useState } from 'react'
import { searchExercises } from '../catalog/searchExercises'
import type { Exercise } from '../catalog/types'
import { useAppData } from '../context/AppDataContext'
import { bodyPartKo, equipmentKo, targetKo } from '../lib/labelsKo'
import { tKo } from '../lib/tKo'
import { createId } from '../store/createId'
import type { CustomExercise } from '../types/models'
import { ExercisePreview } from './ExercisePreview'

type StatusFilter = 'all' | 'recent' | 'custom'

interface Props {
  catalog: Exercise[]
  onPick: (exercise: Exercise) => void
  excludeIds?: string[]
  preferBodyPart?: string
}

export function ExercisePicker({
  catalog,
  onPick,
  excludeIds = [],
  preferBodyPart,
}: Props) {
  const { recentExerciseIds, saveCustomExercise } = useAppData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [bodyPart, setBodyPart] = useState(preferBodyPart ?? '')
  const [equipment, setEquipment] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customBodyPart, setCustomBodyPart] = useState(preferBodyPart || 'upper legs')
  const [customTarget, setCustomTarget] = useState('quads')
  const [customEquipment, setCustomEquipment] = useState('smith machine')
  const [customError, setCustomError] = useState('')

  useEffect(() => {
    if (preferBodyPart) setBodyPart(preferBodyPart)
  }, [preferBodyPart])

  const bodyParts = useMemo(
    () => [...new Set(catalog.map((e) => e.bodyPart))].sort(),
    [catalog],
  )
  const equipments = useMemo(
    () => [...new Set(catalog.map((e) => e.equipment))].sort(),
    [catalog],
  )
  const targets = useMemo(
    () => [...new Set(catalog.map((e) => e.target))].sort(),
    [catalog],
  )

  const recentSet = useMemo(() => new Set(recentExerciseIds), [recentExerciseIds])

  const results = useMemo(() => {
    const excluded = new Set(excludeIds)
    let list = searchExercises(catalog, query, {
      bodyPart: bodyPart || undefined,
      equipment: equipment || undefined,
    }).filter((e) => !excluded.has(e.id))

    if (status === 'custom') {
      list = list.filter((e) => e.source === 'custom')
    } else if (status === 'recent') {
      list = list.filter((e) => recentSet.has(e.id))
      list.sort(
        (a, b) => recentExerciseIds.indexOf(a.id) - recentExerciseIds.indexOf(b.id),
      )
    }

    return list
  }, [
    catalog,
    query,
    bodyPart,
    equipment,
    excludeIds,
    status,
    recentSet,
    recentExerciseIds,
  ])

  const saveCustom = async () => {
    const name = customName.trim()
    if (!name) {
      setCustomError('운동 이름을 입력하세요')
      return
    }
    setCustomError('')
    const row: CustomExercise = {
      id: `custom-${createId()}`,
      name,
      bodyPart: customBodyPart,
      target: customTarget,
      equipment: customEquipment,
      createdAt: new Date().toISOString(),
    }
    await saveCustomExercise(row)
    setShowCustomForm(false)
    setCustomName('')
    setStatus('custom')
    const asExercise = catalog.find((e) => e.id === row.id)
    // catalog updates async after refresh — pick via constructed entry
    onPick({
      id: row.id,
      name: row.name,
      bodyPart: row.bodyPart,
      target: row.target,
      secondaryMuscles: [],
      equipment: row.equipment,
      difficulty: 'intermediate',
      steps: [],
      formCues: [],
      commonMistakes: [],
      videos: {},
      thumbnails: {},
      source: 'custom',
    })
    void asExercise
  }

  return (
    <div className="exercise-picker">
      <input
        className="field"
        placeholder="운동 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chip-row" role="tablist" aria-label="목록 필터">
        {(
          [
            ['all', '전체'],
            ['recent', '최근'],
            ['custom', '커스텀'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={status === id}
            className={`chip ${status === id ? 'is-active' : ''}`}
            onClick={() => setStatus(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="chip-row" role="listbox" aria-label="부위 필터">
        <button
          type="button"
          className={`chip chip-secondary ${bodyPart === '' ? 'is-active' : ''}`}
          onClick={() => setBodyPart('')}
        >
          전체
        </button>
        {bodyParts.map((part) => (
          <button
            key={part}
            type="button"
            className={`chip chip-secondary ${bodyPart === part ? 'is-active' : ''}`}
            onClick={() => setBodyPart(part)}
          >
            {bodyPartKo(part)}
          </button>
        ))}
      </div>

      <div className="chip-row" role="listbox" aria-label="장비 필터">
        <button
          type="button"
          className={`chip chip-secondary ${equipment === '' ? 'is-active' : ''}`}
          onClick={() => setEquipment('')}
        >
          전체
        </button>
        {equipments.map((eq) => (
          <button
            key={eq}
            type="button"
            className={`chip chip-secondary ${equipment === eq ? 'is-active' : ''}`}
            onClick={() => setEquipment(eq)}
          >
            {equipmentKo(eq)}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-ghost interactive custom-add-btn"
        onClick={() => setShowCustomForm((v) => !v)}
      >
        + 커스텀 운동 추가
      </button>

      {showCustomForm && (
        <div className="card stack custom-form">
          <input
            className="field"
            placeholder="운동 이름 (예: 스미스 머신 스쿼트)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <div className="row">
            <select
              className="field"
              value={customBodyPart}
              onChange={(e) => setCustomBodyPart(e.target.value)}
              aria-label="부위"
              style={{ flex: 1 }}
            >
              {bodyParts.map((part) => (
                <option key={part} value={part}>
                  {bodyPartKo(part)}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={customTarget}
              onChange={(e) => setCustomTarget(e.target.value)}
              aria-label="주 근육"
              style={{ flex: 1 }}
            >
              {targets.map((t) => (
                <option key={t} value={t}>
                  {targetKo(t)}
                </option>
              ))}
            </select>
          </div>
          <select
            className="field"
            value={customEquipment}
            onChange={(e) => setCustomEquipment(e.target.value)}
            aria-label="장비"
          >
            {equipments.map((eq) => (
              <option key={eq} value={eq}>
                {equipmentKo(eq)}
              </option>
            ))}
          </select>
          {customError && <p className="error-text">{customError}</p>}
          <div className="row">
            <button type="button" className="btn btn-primary interactive" onClick={() => void saveCustom()}>
              저장하고 담기
            </button>
            <button
              type="button"
              className="btn btn-ghost interactive"
              onClick={() => setShowCustomForm(false)}
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="exercise-picker-list">
        {results.length === 0 && (
          <p className="muted" style={{ padding: '12px 4px' }}>
            {status === 'recent'
              ? '최근 수행한 운동이 아직 없어요.'
              : status === 'custom'
                ? '커스텀 운동이 없어요. 위에서 추가해 보세요.'
                : '검색 결과가 없어요.'}
          </p>
        )}
        {results.slice(0, 60).map((ex) => (
          <button
            key={ex.id}
            type="button"
            className="card row"
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => onPick(ex)}
          >
            <ExercisePreview exercise={ex} media="image" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>{tKo(ex.name)}</div>
              <div className="muted">
                {targetKo(ex.target)}
                {ex.secondaryMuscles?.[0] ? ` · ${targetKo(ex.secondaryMuscles[0])}` : ''}
                {' · '}
                {equipmentKo(ex.equipment)}
                {ex.source === 'custom' ? ' · 커스텀' : ''}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
