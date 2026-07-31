import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExercisePicker } from '../components/ExercisePicker'
import { MuscleMap } from '../components/MuscleMap'
import { RestField } from '../components/RestField'
import { Sheet } from '../components/Sheet'
import { useAppData } from '../context/AppDataContext'
import { buildRoutineSessionItems } from '../lib/format'
import { createId } from '../store/createId'
import { targetKo } from '../lib/labelsKo'
import { activationFor, isWholeBody } from '../lib/muscleMap'
import { formatRest, hasRoutineRestOverride, routineRestFor } from '../lib/rest'
import { tKo } from '../lib/tKo'
import type { Routine, Session } from '../types/models'

export function RoutineEditPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const { catalog, store, refresh, routines, settings } = useAppData()
  const existing = routines.find((r) => r.id === id)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [exerciseIds, setExerciseIds] = useState<string[]>([])
  const [restById, setRestById] = useState<Record<string, number>>({})
  const [showPicker, setShowPicker] = useState(false)
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setExerciseIds(existing.exerciseIds)
      setRestById(existing.restByExerciseId ?? {})
    } else if (isNew) {
      setName('')
      setExerciseIds([])
      setRestById({})
    }
  }, [existing, isNew])

  const clearRest = (eid: string) =>
    setRestById((m) => {
      const next = { ...m }
      delete next[eid]
      return next
    })

  const removeExercise = (index: number, eid: string) => {
    setExerciseIds((ids) => ids.filter((_, i) => i !== index))
    clearRest(eid)
  }

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      alert('루틴 이름을 입력하세요')
      return
    }
    const now = new Date().toISOString()
    const restByExerciseId: Record<string, number> = {}
    for (const eid of exerciseIds) {
      if (restById[eid] !== undefined) restByExerciseId[eid] = restById[eid]
    }
    const routine: Routine = {
      id: isNew ? createId() : (existing?.id ?? createId()),
      name: trimmed,
      exerciseIds,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastPerformedAt: existing?.lastPerformedAt,
    }
    // Only persist the field when there is at least one override, keeping legacy
    // routines free of the key.
    if (Object.keys(restByExerciseId).length > 0) {
      routine.restByExerciseId = restByExerciseId
    }
    await store.upsertRoutine(routine)
    await refresh()
    navigate(`/routines/${routine.id}`)
  }

  return (
    <div className="stack page-enter">
      <Link to={isNew ? '/' : `/routines/${id}`} className="muted interactive">
        ← 뒤로
      </Link>
      <h1 className="page-title">{isNew ? '루틴 추가' : '루틴 편집'}</h1>
      <input
        className="field"
        placeholder="루틴 이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>운동 {exerciseIds.length}</strong>
          <button
            type="button"
            className="btn btn-ghost interactive"
            onClick={() => setShowPicker(true)}
          >
            운동 담기
          </button>
        </div>
        {exerciseIds.map((eid, index) => {
          const ex = byId.get(eid)
          const override = restById[eid]
          const isDefault = override === undefined
          const effective = override ?? settings.defaultRestSeconds
          return (
            <div key={`${eid}-${index}`} className="card stack">
              <div className="row">
                <img
                  className="thumb"
                  src={ex?.thumbnails.male ?? ex?.thumbnails.female}
                  alt=""
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>{ex ? tKo(ex.name) : eid}</div>
                  <div className="muted">{ex ? targetKo(ex.target) : ''}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost interactive"
                  onClick={() => removeExercise(index, eid)}
                >
                  삭제
                </button>
              </div>
              <RestField
                label="휴식 시간"
                seconds={effective}
                isDefault={isDefault}
                onUseDefault={() => clearRest(eid)}
                onChange={(s) => setRestById((m) => ({ ...m, [eid]: s }))}
              />
            </div>
          )
        })}
      </div>
      <button type="button" className="btn btn-primary interactive" onClick={() => void save()}>
        저장
      </button>

      {showPicker && (
        <Sheet title="운동 담기" fill hideHeader onClose={() => setShowPicker(false)}>
          <ExercisePicker
            catalog={catalog}
            excludeIds={exerciseIds}
            onClose={() => setShowPicker(false)}
            onPick={(ex) => {
              setExerciseIds((ids) => [...ids, ex.id])
              setShowPicker(false)
            }}
          />
        </Sheet>
      )}
    </div>
  )
}

export function RoutineDetailPage() {
  const { id } = useParams()
  const { catalog, store, refresh, routines, inProgress, settings } = useAppData()
  const navigate = useNavigate()
  const routine = routines.find((r) => r.id === id)
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])
  // 이 루틴이 쓰는 부위를 한 장으로 — 시작 전에 오늘 뭘 하는지 보이게 한다.
  const routineExercises = useMemo(
    () => (routine?.exerciseIds ?? []).map((eid) => byId.get(eid)).filter((e) => e !== undefined),
    [routine?.exerciseIds, byId],
  )
  const activation = useMemo(() => activationFor(routineExercises), [routineExercises])

  if (!routine) {
    return (
      <div className="stack">
        <p>루틴을 찾을 수 없어요.</p>
        <Link to="/">홈으로</Link>
      </div>
    )
  }

  const start = async () => {
    if (routine.exerciseIds.length === 0) return
    if (inProgress) {
      if (!confirm('이미 진행 중인 세션이 있어요. 그 세션으로 이동할까요?')) return
      navigate(`/session/${inProgress.id}`)
      return
    }
    const session: Session = {
      id: createId(),
      routineId: routine.id,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      items: buildRoutineSessionItems(routine, settings.defaultRestSeconds),
    }
    await store.saveSession(session)
    await refresh()
    navigate(`/session/${session.id}`)
  }

  const remove = async () => {
    if (!confirm('이 루틴을 삭제할까요?')) return
    await store.deleteRoutine(routine.id)
    await refresh()
    navigate('/')
  }

  return (
    <div className="stack">
      <Link to="/" className="muted">
        ← 홈
      </Link>
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="page-title">{routine.name}</h1>
        <Link className="btn btn-ghost" to={`/routines/${routine.id}/edit`}>
          편집
        </Link>
      </header>
      {routineExercises.length > 0 && (
        <div className="card">
          <MuscleMap
            activation={activation}
            wholeBody={routineExercises.every((ex) => isWholeBody(ex))}
          />
        </div>
      )}
      {routine.exerciseIds.map((eid) => {
        const ex = byId.get(eid)
        const rest = routineRestFor(routine, eid, settings.defaultRestSeconds)
        const isDefault = !hasRoutineRestOverride(routine, eid)
        return (
          <div key={eid} className="card row">
            <img className="thumb" src={ex?.thumbnails.male ?? ex?.thumbnails.female} alt="" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{ex ? tKo(ex.name) : eid}</strong>
              <div className="muted">
                {ex ? targetKo(ex.target) : ''}
                {ex?.secondaryMuscles?.length
                  ? `, ${ex.secondaryMuscles.slice(0, 2).map((m) => targetKo(m)).join(', ')}`
                  : ''}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                휴식 {formatRest(rest)}
                {isDefault ? ' · 기본값' : ''}
              </div>
            </div>
          </div>
        )
      })}
      <button
        type="button"
        className="btn btn-primary"
        disabled={routine.exerciseIds.length === 0}
        onClick={() => void start()}
      >
        시작
      </button>
      <button type="button" className="btn btn-danger" onClick={() => void remove()}>
        루틴 삭제
      </button>
    </div>
  )
}
