import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatedStat } from '../components/AnimatedStat'
import { CompleteBurst } from '../components/CompleteBurst'
import { ExerciseInfoSheet } from '../components/ExerciseInfoSheet'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExercisePreview } from '../components/ExercisePreview'
import { RestTimer } from '../components/RestTimer'
import { useAppData } from '../context/AppDataContext'
import { sessionItemFromExercise } from '../lib/format'
import { targetKo } from '../lib/labelsKo'
import { tKo } from '../lib/tKo'
import {
  exerciseRepsEntered,
  exerciseVolumeEntered,
  sessionRepsEntered,
  sessionVolume,
} from '../store/volume'
import type { Session, SessionSet } from '../types/models'

type PickerMode = 'add' | 'replace' | null

export function SessionPage() {
  const { id } = useParams()
  const { store, catalog, settings, setSettings, refresh } = useAppData()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [pickerMode, setPickerMode] = useState<PickerMode>(null)
  const [restToken, setRestToken] = useState(0)
  const [burstSet, setBurstSet] = useState<number | null>(null)
  const [flashSet, setFlashSet] = useState<number | null>(null)
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])

  useEffect(() => {
    if (!id) return
    void store.getSession(id).then((s) => {
      if (!s) {
        setSession(null)
        return
      }
      setSession(s)
      const firstIncomplete = s.items.findIndex((item) =>
        item.sets.some((set) => !set.completed),
      )
      setIndex(firstIncomplete >= 0 ? firstIncomplete : Math.max(0, s.items.length - 1))
    })
  }, [id, store])

  const persist = async (next: Session) => {
    setSession(next)
    await store.saveSession(next)
  }

  if (!session) {
    return (
      <div className="stack page-enter">
        <p>세션을 찾을 수 없어요.</p>
        <Link to="/">홈</Link>
      </div>
    )
  }

  const current = session.items[index]
  const exercise = current ? byId.get(current.exerciseId) : undefined
  const volume = sessionVolume(session)
  const sessionReps = sessionRepsEntered(session)
  const currentReps = current ? exerciseRepsEntered(current) : 0
  const currentVolumeLive = current ? exerciseVolumeEntered(current) : 0
  const exerciseName = exercise ? tKo(exercise.name) : current?.exerciseId

  const updateSet = (setNumber: number, patch: Partial<SessionSet>) => {
    if (!current) return
    const items = session.items.map((item, i) => {
      if (i !== index) return item
      return {
        ...item,
        sets: item.sets.map((s) => (s.setNumber === setNumber ? { ...s, ...patch } : s)),
      }
    })
    void persist({ ...session, items })
  }

  const toggleComplete = (setNumber: number) => {
    if (!current) return
    const set = current.sets.find((s) => s.setNumber === setNumber)
    if (!set) return
    if (!set.completed) {
      if (set.weightKg <= 0 || set.reps <= 0) {
        setError('완료하려면 중량(kg)과 횟수를 0보다 크게 입력하세요')
        return
      }
      setError('')
      updateSet(setNumber, { completed: true })
      setRestToken((n) => n + 1)
      setBurstSet(setNumber)
      setFlashSet(setNumber)
      window.setTimeout(() => setBurstSet(null), 600)
      window.setTimeout(() => setFlashSet(null), 450)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(12)
      }
    } else {
      updateSet(setNumber, { completed: false })
    }
  }

  const addSet = () => {
    if (!current) return
    const nextNumber = current.sets.length + 1
    const items = session.items.map((item, i) =>
      i === index
        ? {
            ...item,
            sets: [
              ...item.sets,
              { setNumber: nextNumber, weightKg: 0, reps: 0, completed: false },
            ],
          }
        : item,
    )
    void persist({ ...session, items })
  }

  const removeSet = () => {
    if (!current || current.sets.length <= 1) return
    const items = session.items.map((item, i) =>
      i === index
        ? {
            ...item,
            sets: item.sets.slice(0, -1).map((s, idx) => ({ ...s, setNumber: idx + 1 })),
          }
        : item,
    )
    void persist({ ...session, items })
  }

  const goNext = () => {
    if (index < session.items.length - 1) setIndex(index + 1)
  }

  const skip = () => {
    if (session.items.length === 0) return
    if (index >= session.items.length - 1) {
      setIndex(Math.max(0, session.items.length - 2))
    }
    const items = session.items
      .filter((_, i) => i !== index)
      .map((item, order) => ({ ...item, order }))
    void persist({ ...session, items })
  }

  const replaceExercise = (exerciseId: string) => {
    if (!current) return
    const items = session.items.map((item, i) =>
      i === index
        ? {
            ...item,
            exerciseId,
            sets: item.sets.map((s) => ({ ...s, completed: false })),
          }
        : item,
    )
    void persist({ ...session, items }).then(() => setPickerMode(null))
  }

  const finish = async () => {
    const incomplete = session.items.some((item) => item.sets.some((s) => !s.completed))
    if (incomplete && !confirm('완료되지 않은 세트가 있어요. 그래도 종료할까요?')) return
    const done = await store.completeSession(session.id)
    await refresh()
    navigate(`/history/${done.id}`)
  }

  const discard = async () => {
    if (!confirm('이 세션을 폐기할까요?')) return
    await store.discardSession(session.id)
    await refresh()
    navigate('/')
  }

  return (
    <div className="stack page-enter stagger">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Link to="/" className="muted interactive">
          ← 홈
        </Link>
        <div className="progress-pills" aria-hidden>
          {session.items.map((item, i) => {
            const done = item.sets.length > 0 && item.sets.every((s) => s.completed)
            return (
              <span
                key={`${item.exerciseId}-${i}`}
                className={`${done ? 'done' : ''} ${i === index ? 'current' : ''}`}
              />
            )
          })}
        </div>
        <span className="muted">
          {session.items.length === 0 ? '0/0' : `${index + 1}/${session.items.length}`}
        </span>
      </div>

      <div className="card row" style={{ justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="muted">세션 볼륨(완료)</div>
          <AnimatedStat value={volume}>
            <span style={{ color: 'var(--accent)' }}>{volume} kg</span>
          </AnimatedStat>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="muted">세션 횟수 합</div>
          <AnimatedStat value={sessionReps}>{sessionReps} 회</AnimatedStat>
        </div>
      </div>

      {session.items.length === 0 ? (
        <div className="card stack">
          <p className="muted">운동을 추가해서 기록을 시작하세요.</p>
          <button
            type="button"
            className="btn btn-primary interactive"
            onClick={() => setPickerMode('add')}
          >
            운동 추가
          </button>
        </div>
      ) : (
        <>
          <div className="card stack">
            <div className="row">
              {exercise && <ExercisePreview exercise={exercise} size="hero" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: '1.15rem' }}>{exerciseName}</h2>
                <div className="muted">{exercise ? targetKo(exercise.target) : ''}</div>
                <div className="row" style={{ marginTop: 8, gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <span className="muted" style={{ fontSize: 12 }}>
                      횟수 합{' '}
                    </span>
                    <AnimatedStat value={currentReps}>
                      <span style={{ color: 'var(--accent)' }}>{currentReps} 회</span>
                    </AnimatedStat>
                  </div>
                  <div>
                    <span className="muted" style={{ fontSize: 12 }}>
                      이 운동 볼륨{' '}
                    </span>
                    <AnimatedStat value={currentVolumeLive}>{currentVolumeLive} kg</AnimatedStat>
                  </div>
                </div>
              </div>
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-ghost interactive"
                onClick={() => setShowInfo(true)}
              >
                정보
              </button>
              <button
                type="button"
                className="btn btn-ghost interactive"
                onClick={() => setPickerMode('replace')}
              >
                운동 대체
              </button>
            </div>
          </div>

          <div className="stack">
            <div className="set-grid muted" style={{ fontSize: 12 }}>
              <span>세트</span>
              <span>KG</span>
              <span>회</span>
              <span>완료</span>
            </div>
            {current.sets.map((set) => (
              <div
                key={set.setNumber}
                className={`set-grid ${flashSet === set.setNumber ? 'set-row-flash' : ''}`}
              >
                <span>{set.setNumber}</span>
                <input
                  className="field"
                  type="number"
                  min={0}
                  value={set.weightKg || ''}
                  onChange={(e) =>
                    updateSet(set.setNumber, { weightKg: Number(e.target.value) || 0 })
                  }
                />
                <input
                  className="field"
                  type="number"
                  min={0}
                  value={set.reps || ''}
                  onChange={(e) =>
                    updateSet(set.setNumber, { reps: Number(e.target.value) || 0 })
                  }
                />
                <button
                  type="button"
                  className={`btn set-done-btn interactive ${set.completed ? 'is-complete' : ''}`}
                  style={{
                    background: set.completed ? 'var(--accent)' : 'var(--bg-input)',
                    color: set.completed ? 'var(--accent-ink)' : 'var(--text)',
                    borderRadius: 10,
                    padding: 10,
                  }}
                  onClick={() => toggleComplete(set.setNumber)}
                  aria-label={`세트 ${set.setNumber} 완료`}
                >
                  {set.completed ? '✓' : '○'}
                  <CompleteBurst active={burstSet === set.setNumber} />
                </button>
              </div>
            ))}
            {error && <p className="error-text">{error}</p>}
          </div>

          <div className="row">
            <button type="button" className="btn btn-ghost interactive" onClick={addSet}>
              + 세트
            </button>
            <button type="button" className="btn btn-ghost interactive" onClick={removeSet}>
              − 세트
            </button>
          </div>

          <RestTimer
            initialSeconds={current.restSecondsDefault ?? settings.defaultRestSeconds}
            restartToken={restToken}
            onAdjustDefault={(seconds) => {
              void setSettings({ ...settings, defaultRestSeconds: seconds })
            }}
          />

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost interactive" onClick={goNext}>
              다음 운동
            </button>
            <button type="button" className="btn btn-ghost interactive" onClick={skip}>
              스킵
            </button>
            <button
              type="button"
              className="btn btn-ghost interactive"
              onClick={() => setPickerMode('add')}
            >
              운동 추가
            </button>
          </div>
        </>
      )}

      <button type="button" className="btn btn-primary interactive" onClick={() => void finish()}>
        세션 종료
      </button>
      <button type="button" className="btn btn-danger interactive" onClick={() => void discard()}>
        폐기
      </button>

      {pickerMode && (
        <div className="sheet-backdrop" onClick={() => setPickerMode(null)} role="presentation">
          <div className="sheet sheet-fill stack" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2>{pickerMode === 'replace' ? '운동 대체' : '운동 추가'}</h2>
              <button
                type="button"
                className="btn btn-ghost interactive"
                onClick={() => setPickerMode(null)}
              >
                닫기
              </button>
            </div>
            <ExercisePicker
              key={`${pickerMode}-${exercise?.bodyPart ?? 'all'}`}
              catalog={catalog}
              preferBodyPart={pickerMode === 'replace' ? exercise?.bodyPart : undefined}
              excludeIds={pickerMode === 'replace' && current ? [current.exerciseId] : []}
              onPick={(ex) => {
                if (pickerMode === 'replace') {
                  replaceExercise(ex.id)
                  return
                }
                const item = sessionItemFromExercise(
                  ex.id,
                  session.items.length,
                  settings.defaultRestSeconds,
                )
                void persist({ ...session, items: [...session.items, item] }).then(() => {
                  setIndex(session.items.length)
                  setPickerMode(null)
                })
              }}
            />
          </div>
        </div>
      )}

      {showInfo && exercise && (
        <ExerciseInfoSheet exercise={exercise} onClose={() => setShowInfo(false)} />
      )}
    </div>
  )
}
