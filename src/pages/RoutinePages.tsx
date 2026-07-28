import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExercisePicker } from '../components/ExercisePicker'
import { useAppData } from '../context/AppDataContext'
import { sessionItemFromExercise } from '../lib/format'
import { createId } from '../store/createId'
import type { Routine, Session } from '../types/models'

export function RoutineEditPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const { catalog, store, refresh, routines } = useAppData()
  const existing = routines.find((r) => r.id === id)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [exerciseIds, setExerciseIds] = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setExerciseIds(existing.exerciseIds)
    } else if (isNew) {
      setName('')
      setExerciseIds([])
    }
  }, [existing, isNew])

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      alert('루틴 이름을 입력하세요')
      return
    }
    const now = new Date().toISOString()
    const routine: Routine = {
      id: isNew ? createId() : (existing?.id ?? createId()),
      name: trimmed,
      exerciseIds,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastPerformedAt: existing?.lastPerformedAt,
    }
    await store.upsertRoutine(routine)
    await refresh()
    navigate(`/routines/${routine.id}`)
  }

  return (
    <div className="stack">
      <Link to={isNew ? '/' : `/routines/${id}`} className="muted">
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
          <button type="button" className="btn btn-ghost" onClick={() => setShowPicker((v) => !v)}>
            {showPicker ? '닫기' : '운동 담기'}
          </button>
        </div>
        {showPicker && (
          <ExercisePicker
            catalog={catalog}
            excludeIds={exerciseIds}
            onPick={(ex) => {
              setExerciseIds((ids) => [...ids, ex.id])
              setShowPicker(false)
            }}
          />
        )}
        {exerciseIds.map((eid, index) => {
          const ex = byId.get(eid)
          return (
            <div key={`${eid}-${index}`} className="card row">
              <img
                className="thumb"
                src={ex?.thumbnails.male ?? ex?.thumbnails.female}
                alt=""
              />
              <div style={{ flex: 1 }}>
                <div>{ex?.name ?? eid}</div>
                <div className="muted">{ex?.target}</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setExerciseIds((ids) => ids.filter((_, i) => i !== index))}
              >
                삭제
              </button>
            </div>
          )
        })}
      </div>
      <button type="button" className="btn btn-primary" onClick={() => void save()}>
        저장
      </button>
    </div>
  )
}

export function RoutineDetailPage() {
  const { id } = useParams()
  const { catalog, store, refresh, routines, inProgress, settings } = useAppData()
  const navigate = useNavigate()
  const routine = routines.find((r) => r.id === id)
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])

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
      items: routine.exerciseIds.map((eid, order) =>
        sessionItemFromExercise(eid, order, settings.defaultRestSeconds),
      ),
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
      {routine.exerciseIds.map((eid) => {
        const ex = byId.get(eid)
        return (
          <div key={eid} className="card row">
            <img className="thumb" src={ex?.thumbnails.male ?? ex?.thumbnails.female} alt="" />
            <div>
              <strong>{ex?.name ?? eid}</strong>
              <div className="muted">
                {ex?.target}
                {ex?.secondaryMuscles?.length ? `, ${ex.secondaryMuscles.slice(0, 2).join(', ')}` : ''}
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
