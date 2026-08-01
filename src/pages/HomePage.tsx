import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionButton } from '../components/ActionButton'
import { EmptyState, NavCard, PageHeader, SectionHeader } from '../components/primitives'
import { ResumeBanner } from '../components/ResumeBanner'
import { useAppData } from '../context/AppDataContext'
import { CHALLENGES } from '../data/challenges'
import { formatClock, totalSeconds } from '../lib/challenge'
import { relativeTime, routineTargets } from '../lib/format'
import { formatRest } from '../lib/rest'
import { createId } from '../store/createId'
import { APP_NAME } from '../types/models'
import type { Session } from '../types/models'

export function HomePage() {
  const { routines, catalog, inProgress, store, refresh, settings } = useAppData()
  const navigate = useNavigate()
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])

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
      <PageHeader title={APP_NAME} description="루틴을 고르거나 바로 기록하세요" />

      {inProgress && <ResumeBanner session={inProgress} onDiscard={() => void discard()} />}

      <section className="stack">
        <SectionHeader title="내 루틴" aside={`${routines.length}개`} />
        {routines.length === 0 ? (
          <EmptyState
            title="아직 루틴이 없어요"
            description="자주 하는 운동을 루틴으로 묶어 두면 바로 시작할 수 있어요."
            action={
              <Link to="/routines/new" className="btn btn-ghost interactive">
                첫 루틴 만들기
              </Link>
            }
          />
        ) : (
          routines.map((routine) => (
            <NavCard
              key={routine.id}
              to={`/routines/${routine.id}`}
              ariaLabel={`${routine.name} 루틴 열기`}
            >
              <span className="card-title">{routine.name}</span>
              <span className="card-targets">{routineTargets(routine.exerciseIds, byId)}</span>
              <span className="card-meta">{relativeTime(routine.lastPerformedAt)}</span>
            </NavCard>
          ))
        )}
      </section>

      <section className="stack">
        <SectionHeader title="챌린지" aside={`${CHALLENGES.length}개`} />
        {CHALLENGES.map((c) => (
          <NavCard
            key={c.id}
            to={`/challenges/${c.id}`}
            ariaLabel={`${c.name} 챌린지 열기`}
          >
            <span className="card-title">{c.name}</span>
            <span className="card-targets">{c.steps.map((s) => s.name).join(' · ')}</span>
            <span className="card-meta">
              {formatClock(totalSeconds(c))} · 동작 {c.steps.length}개
            </span>
          </NavCard>
        ))}
      </section>

      <div className="fab-bar">
        <ActionButton
          variant="brandSolid"
          size="large"
          flexGrow
          onClick={() => void startFree()}
        >
          {inProgress ? '이어서 기록하기' : '자유운동 시작'}
        </ActionButton>
        <ActionButton asChild variant="neutralWeak" size="large" flexGrow>
          <Link to="/routines/new">루틴 추가</Link>
        </ActionButton>
      </div>
      <Link
        to="/settings"
        className="muted interactive"
        style={{ fontSize: 12 }}
        aria-label={`설정 열기, 기본 휴식 ${formatRest(settings.defaultRestSeconds)}`}
      >
        설정 · 기본 휴식 {formatRest(settings.defaultRestSeconds)} ›
      </Link>
    </div>
  )
}
