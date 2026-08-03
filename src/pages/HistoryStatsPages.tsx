import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState, NavCard, PageHeader, SectionHeader, Stat } from '../components/primitives'
import { useAppData } from '../context/AppDataContext'
import { estimateSessionCalories } from '../lib/calories'
import { formatDateKey, sessionItemName } from '../lib/format'
import { formatMetricSet, metricTypeOf, formatDuration } from '../lib/metrics'
import { tKo } from '../lib/tKo'
import {
  exerciseVolume,
  sessionCompletedSets,
  sessionDurationSec,
  sessionElapsedSec,
  sessionVolume,
} from '../store/volume'
import { weeklyStats } from '../store/stats'
import type { Session } from '../types/models'

export function HistoryPage() {
  const { store, exerciseById: byId } = useAppData()
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    void store.listSessions({ status: 'completed' }).then(setSessions)
  }, [store])

  const groups = useMemo(() => {
    const map = new Map<string, Session[]>()
    for (const s of sessions) {
      const key = formatDateKey(s.endedAt ?? s.startedAt)
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [sessions])

  return (
    <div className="stack page-enter">
      <PageHeader title="기록" description="완료한 운동 세션을 날짜별로 모아 봐요" />
      {sessions.length === 0 ? (
        <EmptyState
          title="완료된 세션이 아직 없어요"
          description="운동을 마치면 여기에서 날짜별로 기록을 다시 볼 수 있어요."
          action={
            <Link to="/" className="btn btn-ghost interactive">
              운동 시작하러 가기
            </Link>
          }
        />
      ) : (
        groups.map(([date, list]) => (
          <section key={date} className="stack">
            <SectionHeader title={date} aside={`${list.length}회`} />
            {list.map((s) => (
              <NavCard
                key={s.id}
                to={`/history/${s.id}`}
                ariaLabel={`${date} ${s.routineId ? '루틴 세션' : '자유운동'} 상세 보기`}
              >
                <span className="card-title">{s.routineId ? '루틴 세션' : '자유운동'}</span>
                <span className="card-meta">
                  {s.items.length}개 운동
                  {sessionVolume(s) > 0
                    ? ` · 볼륨 ${sessionVolume(s)}kg`
                    : sessionDurationSec(s) > 0
                      ? ` · ${formatDuration(sessionDurationSec(s))}`
                      : ''}
                </span>
                {s.items.length > 0 && (
                  <span className="card-meta">
                    {s.items
                      .slice(0, 3)
                      .map((i) => sessionItemName(i, byId, tKo))
                      .join(', ')}
                  </span>
                )}
              </NavCard>
            ))}
          </section>
        ))
      )}
    </div>
  )
}

export function SessionDetailPage() {
  const { id } = useParams()
  const { store, exerciseById: byId, settings } = useAppData()
  const [session, setSession] = useState<Session | null>(null)
  const [previousByExercise, setPreviousByExercise] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!id) return
    void (async () => {
      const current = await store.getSession(id)
      setSession(current ?? null)
      if (!current) return
      const completed = await store.listSessions({ status: 'completed' })
      const older = completed.filter(
        (s) => s.id !== current.id && s.startedAt < current.startedAt,
      )
      const map = new Map<string, number>()
      for (const item of current.items) {
        const prev = older.find((s) => s.items.some((i) => i.exerciseId === item.exerciseId))
        if (!prev) continue
        const prevItem = prev.items.find((i) => i.exerciseId === item.exerciseId)
        if (prevItem) map.set(item.exerciseId, exerciseVolume(prevItem))
      }
      setPreviousByExercise(map)
    })()
  }, [id, store])

  if (!session) {
    return (
      <div className="stack page-enter">
        <Link to="/history" className="muted interactive">
          ← 기록
        </Link>
        <EmptyState
          title="기록을 찾을 수 없어요"
          description="이미 삭제되었거나 잘못된 주소일 수 있어요."
          action={
            <Link to="/history" className="btn btn-ghost interactive">
              기록으로 돌아가기
            </Link>
          }
        />
      </div>
    )
  }

  // 체중을 모르면 계산하지 않는다 — 아래에서 통째로 숨긴다.
  const calories = estimateSessionCalories(session, settings.bodyWeightKg, (exerciseId) =>
    byId.get(exerciseId),
  )

  return (
    <div className="stack page-enter">
      <Link to="/history" className="muted interactive">
        ← 기록
      </Link>
      <PageHeader title="세션 상세" description={formatDateKey(session.endedAt ?? session.startedAt)} />
      {/* 볼륨은 중량 운동에서만 의미가 있다. 시간으로만 하는 세션(챌린지·유산소)에
          `0 kg`만 띄우면 아무것도 안 한 것처럼 보이므로, 있는 지표만 고른다. */}
      <div className="stat-grid">
        {sessionVolume(session) > 0 && (
          <Stat label="총 볼륨" value={`${sessionVolume(session)} kg`} tone="brand" />
        )}
        {sessionDurationSec(session) > 0 && (
          <Stat
            label="운동 시간"
            value={formatDuration(sessionDurationSec(session))}
            tone={sessionVolume(session) > 0 ? undefined : 'brand'}
          />
        )}
        <Stat label="세트" value={`${sessionCompletedSets(session)}개`} />
        {calories !== null && <Stat label="칼로리(추정)" value={`${calories} kcal`} />}
        {sessionElapsedSec(session) > 0 && (
          <Stat label="소요" value={formatDuration(sessionElapsedSec(session))} />
        )}
      </div>
      {session.items.map((item) => {
        const type = metricTypeOf(item)
        const vol = exerciseVolume(item)
        const prev = previousByExercise.get(item.exerciseId)
        const delta = prev === undefined ? null : vol - prev
        return (
          <div key={`${item.exerciseId}-${item.order}`} className="card stack">
            <strong className="card-title">{sessionItemName(item, byId, tKo)}</strong>
            {type === 'weight_reps' && (
              <div style={{ color: 'var(--accent)' }}>
                볼륨 {vol} kg
                {delta !== null && (
                  <span
                    style={{ color: delta >= 0 ? 'var(--ok)' : 'var(--danger)', marginLeft: 8 }}
                  >
                    {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}kg
                  </span>
                )}
              </div>
            )}
            {item.sets.map((s) => (
              <div key={s.setNumber} className="muted">
                {s.setNumber} · {formatMetricSet(s, type)}
                {s.completed ? '' : ' (미완료)'}
              </div>
            ))}
            {/* 메모는 그날 무엇을 느꼈는지라 기록에서 다시 볼 수 있어야 한다. */}
            {item.note && <p className="session-note muted">{item.note}</p>}
          </div>
        )
      })}
    </div>
  )
}

export function StatsPage() {
  const { store } = useAppData()
  const [stats, setStats] = useState({ sessionCount: 0, totalVolume: 0 })

  useEffect(() => {
    void store.listSessions({ status: 'completed' }).then((sessions) => {
      setStats(weeklyStats(sessions))
    })
  }, [store])

  const hasData = stats.sessionCount > 0

  return (
    <div className="stack page-enter">
      <PageHeader title="통계" description="최근 7일 동안의 운동 요약" />
      <div className="stat-grid">
        <Stat label="세션" value={stats.sessionCount} />
        <Stat label="총 볼륨" value={`${stats.totalVolume} kg`} tone="brand" />
      </div>
      {!hasData && (
        <EmptyState
          title="이번 주 기록이 아직 없어요"
          description="운동을 완료하면 최근 7일 세션 수와 총 볼륨이 여기에 쌓여요."
          action={
            <Link to="/" className="btn btn-ghost interactive">
              운동 시작하러 가기
            </Link>
          }
        />
      )}
    </div>
  )
}
