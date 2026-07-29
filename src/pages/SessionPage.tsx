import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatedStat } from '../components/AnimatedStat'
import { CompleteBurst } from '../components/CompleteBurst'
import { DurationField } from '../components/DurationField'
import { ExerciseInfoSheet } from '../components/ExerciseInfoSheet'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExercisePreview } from '../components/ExercisePreview'
import { NumericField } from '../components/NumericField'
import { PreviousRecordDisclosure } from '../components/PreviousRecord'
import { RestField } from '../components/RestField'
import { RestTimer } from '../components/RestTimer'
import { Sheet } from '../components/Sheet'
import { useAppData } from '../context/AppDataContext'
import {
  type EditableSetFields,
  type EntryMode,
  applyRowEdit,
  formatElapsed,
  sessionItemFromExercise,
  setSessionExerciseRest,
} from '../lib/format'
import { targetKo } from '../lib/labelsKo'
import { clampRest, resolveRest } from '../lib/rest'
import {
  METRIC_LABELS,
  METRIC_TYPES,
  completeHint,
  isSetComplete,
  metricFields,
  metricTypeOf,
} from '../lib/metrics'
import { findPreviousRecord } from '../lib/previousRecord'
import { tKo } from '../lib/tKo'
import {
  exerciseRepsEntered,
  exerciseVolumeEntered,
  sessionRepsEntered,
  sessionVolume,
} from '../store/volume'
import type { MetricType, Session, SessionSet } from '../types/models'

type PickerMode = 'add' | 'replace' | null

export function SessionPage() {
  const { id } = useParams()
  const { store, catalog, settings, refresh } = useAppData()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [pickerMode, setPickerMode] = useState<PickerMode>(null)
  const [restToken, setRestToken] = useState(0)
  const [burstSet, setBurstSet] = useState<number | null>(null)
  const [flashSet, setFlashSet] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [entryMode, setEntryMode] = useState<EntryMode>('individual')
  const [cascadeStart, setCascadeStart] = useState<number | null>(null)
  const [completedSessions, setCompletedSessions] = useState<Session[]>([])
  const [prevLoading, setPrevLoading] = useState(true)
  const [prevError, setPrevError] = useState(false)
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

  useEffect(() => {
    if (!session || session.status !== 'in_progress') return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [session?.id, session?.status])

  // Switching exercises restarts cascade selection so a stale highlight never
  // lingers on the next exercise's rows.
  useEffect(() => {
    setCascadeStart(null)
  }, [session?.id, index])

  // Completed history is read once per session load and reused across
  // exercises/renders so previous records never hit IndexedDB per set entry.
  useEffect(() => {
    let cancelled = false
    setPrevLoading(true)
    setPrevError(false)
    store
      .listSessions({ status: 'completed' })
      .then((list) => {
        if (!cancelled) setCompletedSessions(list)
      })
      .catch((err: unknown) => {
        console.warn('FitLog previous-record load failed', err)
        if (!cancelled) setPrevError(true)
      })
      .finally(() => {
        if (!cancelled) setPrevLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [store])

  const previousRecord = useMemo(() => {
    if (!session) return null
    const item = session.items[index]
    if (!item) return null
    return findPreviousRecord(completedSessions, session, item.exerciseId)
  }, [completedSessions, session, index])

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
  const metricType: MetricType = current ? metricTypeOf(current) : 'weight_reps'
  const fields = metricFields(metricType)
  const middleCount = [fields.weight, fields.reps, fields.duration, fields.distance].filter(
    Boolean,
  ).length
  const setGridClass = middleCount <= 1 ? 'set-grid cols-3' : 'set-grid'
  const exercise = current ? byId.get(current.exerciseId) : undefined
  const volume = sessionVolume(session)
  const sessionReps = sessionRepsEntered(session)
  const currentReps = current ? exerciseRepsEntered(current) : 0
  const currentVolumeLive = current ? exerciseVolumeEntered(current) : 0
  const exerciseName = exercise ? tKo(exercise.name) : current?.exerciseId
  const endMs = session.endedAt ? new Date(session.endedAt).getTime() : now
  const elapsedLabel = formatElapsed(endMs - new Date(session.startedAt).getTime())

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
      if (!isSetComplete(set, metricType)) {
        setError(completeHint(metricType))
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

  const setMetricType = (next: MetricType) => {
    if (!current || metricTypeOf(current) === next) return
    const items = session.items.map((item, i) =>
      i === index ? { ...item, metricType: next } : item,
    )
    setError('')
    void persist({ ...session, items })
  }

  // A single field edit. In `bulk` mode the value cascades to the edited row
  // and every row below it (same field only); completion flags stay untouched.
  const editField = (setNumber: number, patch: EditableSetFields) => {
    if (!current) return
    const items = session.items.map((item, i) =>
      i === index ? applyRowEdit(item, setNumber, patch, entryMode) : item,
    )
    void persist({ ...session, items })
  }

  const changeEntryMode = (mode: EntryMode) => {
    setEntryMode(mode)
    if (mode === 'individual') setCascadeStart(null)
  }

  // Per-exercise rest control: updates only the current session exercise. It
  // never touches other exercises or the app-wide default.
  const setCurrentRest = (seconds: number) => {
    if (!current) return
    void persist(setSessionExerciseRest(session, index, clampRest(seconds)))
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
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 4 }}>
          <div className="session-elapsed" aria-live="polite" title="세션 시간">
            {elapsedLabel}
          </div>
          <Link to="/" className="muted interactive" style={{ fontSize: 13 }}>
            ← 홈
          </Link>
        </div>
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
                  {fields.reps && (
                    <div>
                      <span className="muted" style={{ fontSize: 12 }}>
                        횟수 합{' '}
                      </span>
                      <AnimatedStat value={currentReps}>
                        <span style={{ color: 'var(--accent)' }}>{currentReps} 회</span>
                      </AnimatedStat>
                    </div>
                  )}
                  {metricType === 'weight_reps' && (
                    <div>
                      <span className="muted" style={{ fontSize: 12 }}>
                        이 운동 볼륨{' '}
                      </span>
                      <AnimatedStat value={currentVolumeLive}>{currentVolumeLive} kg</AnimatedStat>
                    </div>
                  )}
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
            <label className="metric-select">
              <span className="muted" style={{ fontSize: 12 }}>
                기록 방식
              </span>
              <select
                className="field metric-select-input"
                value={metricType}
                aria-label="기록 방식 선택"
                onChange={(e) => setMetricType(e.target.value as MetricType)}
              >
                {METRIC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {METRIC_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <PreviousRecordDisclosure
              record={previousRecord}
              loading={prevLoading}
              error={prevError}
            />
          </div>

          <div className="stack">
            <div className="entry-mode" role="group" aria-label="세트 입력 방식">
              <button
                type="button"
                className={`entry-mode-btn interactive ${
                  entryMode === 'individual' ? 'is-active' : ''
                }`}
                aria-pressed={entryMode === 'individual'}
                onClick={() => changeEntryMode('individual')}
              >
                개별 입력
              </button>
              <button
                type="button"
                className={`entry-mode-btn interactive ${entryMode === 'bulk' ? 'is-active' : ''}`}
                aria-pressed={entryMode === 'bulk'}
                onClick={() => changeEntryMode('bulk')}
              >
                일괄 입력
              </button>
            </div>
            {entryMode === 'bulk' && (
              <p className="muted entry-mode-hint">선택한 세트부터 아래 세트에 함께 적용돼요.</p>
            )}
            <div className={`${setGridClass} muted`} style={{ fontSize: 12 }}>
              <span>세트</span>
              {fields.weight && <span>KG</span>}
              {fields.duration && <span>시간</span>}
              {fields.distance && <span>km</span>}
              {fields.reps && <span>회</span>}
              <span>완료</span>
            </div>
            {current.sets.map((set) => {
              const cascaded =
                entryMode === 'bulk' && cascadeStart !== null && set.setNumber >= cascadeStart
              const cascadeFocus = () => {
                if (entryMode === 'bulk') setCascadeStart(set.setNumber)
              }
              return (
                <div
                  key={set.setNumber}
                  className={`${setGridClass} ${
                    flashSet === set.setNumber ? 'set-row-flash' : ''
                  } ${cascaded ? 'set-row-cascade' : ''} ${
                    cascadeStart === set.setNumber && entryMode === 'bulk'
                      ? 'set-row-cascade-start'
                      : ''
                  }`}
                >
                  <span>{set.setNumber}</span>
                  {fields.weight && (
                    <NumericField
                      value={set.weightKg}
                      onValueChange={(n) => editField(set.setNumber, { weightKg: n })}
                      onFocus={cascadeFocus}
                      ariaLabel={`세트 ${set.setNumber} 중량(kg)`}
                      decimal
                    />
                  )}
                  {fields.duration && (
                    <DurationField
                      seconds={set.durationSec ?? 0}
                      onSecondsChange={(s) => editField(set.setNumber, { durationSec: s })}
                      onFocus={cascadeFocus}
                      ariaLabel={`세트 ${set.setNumber} 시간(분:초)`}
                    />
                  )}
                  {fields.distance && (
                    <NumericField
                      value={set.distanceKm ?? 0}
                      onValueChange={(n) => editField(set.setNumber, { distanceKm: n })}
                      onFocus={cascadeFocus}
                      ariaLabel={`세트 ${set.setNumber} 거리(km)`}
                      decimal
                    />
                  )}
                  {fields.reps && (
                    <NumericField
                      value={set.reps}
                      onValueChange={(n) => editField(set.setNumber, { reps: n })}
                      onFocus={cascadeFocus}
                      ariaLabel={`세트 ${set.setNumber} 횟수`}
                    />
                  )}
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
              )
            })}
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

          <div className="card stack">
            <RestField
              label="이 운동 휴식 시간"
              seconds={resolveRest(current.restSecondsDefault, settings.defaultRestSeconds)}
              onChange={setCurrentRest}
            />
          </div>

          <RestTimer
            initialSeconds={resolveRest(current.restSecondsDefault, settings.defaultRestSeconds)}
            restartToken={restToken}
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
        <Sheet
          title={pickerMode === 'replace' ? '운동 대체' : '운동 추가'}
          fill
          hideHeader
          onClose={() => setPickerMode(null)}
        >
          <ExercisePicker
            key={`${pickerMode}-${exercise?.bodyPart ?? 'all'}`}
            catalog={catalog}
            onClose={() => setPickerMode(null)}
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
        </Sheet>
      )}

      {showInfo && exercise && (
        <ExerciseInfoSheet exercise={exercise} onClose={() => setShowInfo(false)} />
      )}
    </div>
  )
}
