import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExercisePreview } from '../components/ExercisePreview'
import { MuscleMap } from '../components/MuscleMap'
import { EmptyState, PageHeader } from '../components/primitives'
import { useAppData } from '../context/AppDataContext'
import { findRecommendedRoutine } from '../data/recommendedRoutines'
import { buildRecommendedSessionItems } from '../lib/format'
import { formatDuration } from '../lib/metrics'
import { activationFor, isWholeBody } from '../lib/muscleMap'
import { tKo } from '../lib/tKo'
import { createId } from '../store/createId'
import type { Session } from '../types/models'

/**
 * 추천 루틴 상세 — 목표를 훑어보고 바로 시작한다.
 *
 * 내 루틴으로 저장하는 경로는 두지 않았다. `Routine`에는 목표 횟수를 담을 자리가
 * 없어서 저장하는 순간 "12회"가 사라지고, 그러면 추천의 알맹이가 빠진다.
 */
export function RecommendedRoutinePage() {
  const { id } = useParams()
  const routine = id ? findRecommendedRoutine(id) : undefined
  const { exerciseById, store, refresh, inProgress, settings } = useAppData()
  const navigate = useNavigate()

  const exercises = useMemo(
    () => (routine?.items ?? []).map((i) => exerciseById.get(i.exerciseId)).filter((e) => e !== undefined),
    [routine?.items, exerciseById],
  )
  const activation = useMemo(() => activationFor(exercises), [exercises])

  if (!routine) {
    return (
      <div className="stack page-enter">
        <Link to="/" className="muted interactive">
          ← 홈
        </Link>
        <EmptyState title="루틴을 찾을 수 없어요" description="주소가 잘못되었을 수 있어요." />
      </div>
    )
  }

  const start = async () => {
    if (inProgress) {
      if (!confirm('이미 진행 중인 세션이 있어요. 그 세션으로 이동할까요?')) return
      navigate(`/session/${inProgress.id}`)
      return
    }
    const session: Session = {
      id: createId(),
      routineId: null,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      items: buildRecommendedSessionItems(routine.items, settings.defaultRestSeconds),
    }
    await store.saveSession(session)
    await refresh()
    navigate(`/session/${session.id}`)
  }

  const goal = (item: (typeof routine.items)[number]) => {
    if (item.durationSec !== undefined) return formatDuration(item.durationSec)
    if (item.reps !== undefined) return `${item.reps}회`
    return ''
  }

  return (
    <div className="stack page-enter">
      <Link to="/" className="muted interactive">
        ← 홈
      </Link>
      <PageHeader title={routine.name} description={routine.description} />

      {exercises.length > 0 && (
        <div className="card">
          <MuscleMap
            activation={activation}
            wholeBody={exercises.every((ex) => isWholeBody(ex))}
          />
        </div>
      )}

      {routine.items.map((item, i) => {
        const ex = exerciseById.get(item.exerciseId)
        const name = ex ? tKo(ex.name) : (item.displayName ?? item.exerciseId)
        return (
          <div key={`${item.exerciseId}-${i}`} className="card row recommended-row">
            <span className="recommended-index muted">{i + 1}</span>
            {ex && <ExercisePreview exercise={ex} media="image" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="card-title">{name}</div>
              {item.note && <div className="card-meta">{item.note}</div>}
            </div>
            <strong className="recommended-goal">{goal(item)}</strong>
          </div>
        )
      })}

      {routine.sourceLabel && (
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          출처 · {routine.sourceLabel}
        </p>
      )}

      <div className="fab-bar">
        <button type="button" className="btn btn-primary interactive" onClick={() => void start()}>
          {inProgress ? '진행 중인 세션 보기' : '루틴 시작'}
        </button>
      </div>
    </div>
  )
}
