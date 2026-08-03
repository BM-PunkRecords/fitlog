import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatedStat } from '../components/AnimatedStat'
import { CompleteBurst } from '../components/CompleteBurst'
import { DurationField } from '../components/DurationField'
import { ExerciseInfoSheet } from '../components/ExerciseInfoSheet'
import { ExerciseNote } from '../components/ExerciseNote'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExercisePreview } from '../components/ExercisePreview'
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon, ReplaceIcon } from '../components/icons'
import { NumericField } from '../components/NumericField'
import { PreviousRecordDisclosure } from '../components/PreviousRecord'
import { RestField } from '../components/RestField'
import { RestTimer } from '../components/RestTimer'
import { Sheet } from '../components/Sheet'
import { useAppData } from '../context/AppDataContext'
import {
  type EditableSetFields,
  type EntryMode,
  appendSet,
  applyRowEdit,
  formatElapsed,
  isExerciseComplete,
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
import { type SwipePoint, detectSwipe, isSwipeExempt } from '../lib/swipe'
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
  const { store, catalog, exerciseById: byId, settings, refresh } = useAppData()
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
  const swipeStart = useRef<SwipePoint | null>(null)
  // Which direction the last move came from, so the incoming exercise slides in
  // from the side the finger travelled. Cleared once the animation is spent.
  const [swipeFrom, setSwipeFrom] = useState<'prev' | 'next' | null>(null)

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

  // Pull-to-refresh would reload the app mid-workout and interrupt the rest
  // timer, so it is disabled for the duration of an in-progress session only.
  // The class sets `overscroll-behavior-y: contain` on the scrolling elements;
  // it is removed on unmount/finish so other pages keep the native gesture.
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return
    document.body.classList.add('lock-pull-refresh')
    document.documentElement.classList.add('lock-pull-refresh')
    return () => {
      document.body.classList.remove('lock-pull-refresh')
      document.documentElement.classList.remove('lock-pull-refresh')
    }
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

      // 마지막 세트를 채웠으면 다음 운동으로 넘어간다. 완료 이펙트를 볼 틈은
      // 두고, 그 사이 사용자가 직접 움직였으면(인덱스가 바뀌었으면) 넘기지
      // 않는다 — 손으로 한 조작을 자동 이동이 덮어쓰면 안 된다.
      const willComplete = isExerciseComplete({
        ...current,
        sets: current.sets.map((s) =>
          s.setNumber === setNumber ? { ...s, completed: true } : s,
        ),
      })
      if (willComplete && index < session.items.length - 1) {
        const from = index
        window.setTimeout(() => {
          setIndex((i) => (i === from ? i + 1 : i))
        }, 900)
      }
    } else {
      updateSet(setNumber, { completed: false })
    }
  }

  const addSet = () => {
    if (!current) return
    const items = session.items.map((item, i) => (i === index ? appendSet(item) : item))
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

  const setNote = (note: string) => {
    if (!current) return
    const items = session.items.map((item, i) =>
      i === index ? { ...item, note: note || undefined } : item,
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

  // Navigation bounds drive both the handlers and the disabled state, so a
  // button is never shown as available when there is nowhere to move.
  const hasPrev = index > 0
  const hasNext = index < session.items.length - 1

  const goPrev = () => {
    if (hasPrev) setIndex(index - 1)
  }

  const goNext = () => {
    if (hasNext) setIndex(index + 1)
  }

  // Swipe left/right moves between exercises. It is an addition to the
  // prev/next buttons, never a replacement — the buttons stay the accessible
  // path and the only one a screen reader or keyboard user needs.
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || isSwipeExempt(e.target)) {
      swipeStart.current = null
      return
    }
    const t = e.touches[0]
    swipeStart.current = { x: t.clientX, y: t.clientY, t: Date.now() }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const from = swipeStart.current
    swipeStart.current = null
    // A second finger landing mid-gesture means pinch/zoom, not a swipe.
    if (!from || e.changedTouches.length !== 1 || e.touches.length > 0) return

    const t = e.changedTouches[0]
    const dir = detectSwipe(from, { x: t.clientX, y: t.clientY, t: Date.now() })
    if (!dir) return

    // At a boundary the gesture is simply inert, matching the disabled buttons.
    if (dir === 'next' && hasNext) {
      setSwipeFrom('next')
      goNext()
    } else if (dir === 'prev' && hasPrev) {
      setSwipeFrom('prev')
      goPrev()
    }
  }

  // Skipping drops the exercise from the session, which loses any sets already
  // entered for it — confirm when that would throw away real input.
  const skip = () => {
    if (session.items.length === 0) return
    const entered = current?.sets.some(
      (s) => s.completed || s.weightKg > 0 || s.reps > 0 || s.durationSec || s.distanceKm,
    )
    if (entered && !confirm('이 운동의 입력한 기록이 사라져요. 건너뛸까요?')) return
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
      {/* 운동 중에는 화면을 스크롤하며 세트를 채우므로, 경과 시간은 따라다녀야
          의미가 있다 — 위로 올라가 사라지면 확인하려고 스크롤을 되돌려야 한다. */}
      <header className="session-header">
        <Link to="/" className="muted interactive session-header-back" aria-label="홈으로">
          <ChevronLeftIcon />
        </Link>
        <div className="session-elapsed" aria-live="polite" title="세션 시간">
          {elapsedLabel}
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
        <span className="muted session-header-count">
          {session.items.length === 0 ? '0/0' : `${index + 1}/${session.items.length}`}
        </span>
      </header>

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
          {/* Swipe zone: the exercise card and its set list move together. The
              key restarts the slide-in so each move reads as a card change. */}
          <div
            className="swipe-zone"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchCancel={() => {
              swipeStart.current = null
            }}
          >
            <div
              key={index}
              className={`stack swipe-page ${
                swipeFrom ? `swipe-in-${swipeFrom}` : ''
              }`}
              onAnimationEnd={() => setSwipeFrom(null)}
            >
            <div className="card stack exercise-card">
              {/* Replace lives at the card's top-right as a small icon action so the
                  media + name + stats keep the primary reading order. */}
              <button
                type="button"
                className="icon-btn exercise-replace interactive"
                onClick={() => setPickerMode('replace')}
                aria-label="운동 대체"
                title="운동 대체"
              >
                <ReplaceIcon />
              </button>
              <div className="row">
                {exercise && (
                  // The media itself opens the info sheet — the separate 정보
                  // button was removed in favour of tapping the demo.
                  <button
                    type="button"
                    className="exercise-media-btn interactive"
                    onClick={() => setShowInfo(true)}
                    aria-label={`${exerciseName ?? '운동'} 정보 보기`}
                    title="운동 정보"
                  >
                    <ExercisePreview exercise={exercise} size="hero" />
                    <span className="exercise-media-hint" aria-hidden>
                      <InfoIcon size={14} />
                    </span>
                  </button>
                )}
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
              <ExerciseNote value={current.note ?? ''} onChange={setNote} />
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
          </div>
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

          {/* Exercise navigation: prev/next are a matched pair with the position
              between them, so moving through the session reads as one control
              instead of three same-weight buttons. */}
          <nav className="exercise-nav" aria-label="운동 이동">
            <button
              type="button"
              className="btn btn-ghost interactive exercise-nav-btn"
              onClick={goPrev}
              disabled={!hasPrev}
              aria-label="이전 운동"
            >
              <ChevronLeftIcon />
              <span>이전</span>
            </button>
            <span className="exercise-nav-pos" aria-hidden>
              {index + 1} / {session.items.length}
            </span>
            <button
              type="button"
              className="btn btn-ghost interactive exercise-nav-btn"
              onClick={goNext}
              disabled={!hasNext}
              aria-label="다음 운동"
            >
              <span>다음</span>
              <ChevronRightIcon />
            </button>
          </nav>

          {/* Adding is the constructive action and stays visually primary-ish;
              skip removes the exercise from the session, so it is separated and
              de-emphasised to avoid an accidental destructive tap. */}
          <div className="session-actions">
            <button
              type="button"
              className="btn btn-ghost interactive session-action-add"
              onClick={() => setPickerMode('add')}
            >
＋ 운동 추가
            </button>
            <button
              type="button"
              className="btn btn-quiet interactive session-action-skip"
              onClick={skip}
              aria-label="이 운동 건너뛰기"
            >
              건너뛰기
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
