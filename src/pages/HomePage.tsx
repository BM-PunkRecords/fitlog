import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ResumeBanner } from '../components/ResumeBanner'
import { useAppData } from '../context/AppDataContext'
import { relativeTime, routineTargets } from '../lib/format'
import { createId } from '../store/createId'
import { APP_NAME } from '../types/models'
import type { Session } from '../types/models'

export function HomePage() {
  const { ready, routines, catalog, inProgress, store, refresh, settings } = useAppData()
  const navigate = useNavigate()
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])

  if (!ready) return <p className="muted page-enter">불러오는 중…</p>

  const startFree = async () => {
    if (inProgress) {
      navigate(`/session/${inProgress.id}`)
      return
    }
    const session: Session = {
      id: createId(),
      routineId: null,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      items: [],
    }
    await store.saveSession(session)
    await refresh()
    navigate(`/session/${session.id}`)
  }

  const discard = async () => {
    if (!inProgress) return
    if (!confirm('진행 중인 세션을 폐기할까요?')) return
    await store.discardSession(inProgress.id)
    await refresh()
  }

  return (
    <div className="stack page-enter stagger">
      <header>
        <h1 className="page-title">{APP_NAME}</h1>
        <p className="muted">루틴을 고르거나 바로 기록하세요</p>
      </header>

      {inProgress && <ResumeBanner session={inProgress} onDiscard={() => void discard()} />}

      <section className="stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>내 루틴</h2>
          <span className="muted">{routines.length}개</span>
        </div>
        {routines.length === 0 && (
          <div className="card muted">아직 루틴이 없어요. 추가 버튼으로 만들어 보세요.</div>
        )}
        {routines.map((routine) => (
          <Link
            key={routine.id}
            to={`/routines/${routine.id}`}
            className="card row interactive"
          >
            <div style={{ flex: 1 }}>
              <strong>{routine.name}</strong>
              <div style={{ color: 'var(--ok)', marginTop: 4 }}>
                {routineTargets(routine.exerciseIds, byId)}
              </div>
              <div className="muted" style={{ marginTop: 4 }}>
                {relativeTime(routine.lastPerformedAt)}
              </div>
            </div>
            <span className="muted">›</span>
          </Link>
        ))}
      </section>

      <div className="fab-bar">
        <button
          type="button"
          className="btn btn-primary interactive"
          onClick={() => void startFree()}
        >
          자유운동
        </button>
        <Link className="btn btn-ghost interactive" to="/routines/new">
          추가
        </Link>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        기본 휴식 {settings.defaultRestSeconds}초
      </p>
    </div>
  )
}
