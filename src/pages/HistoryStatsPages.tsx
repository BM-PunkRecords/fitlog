import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { formatDateKey } from '../lib/format'
import { tKo } from '../lib/tKo'
import { exerciseVolume, sessionVolume } from '../store/volume'
import { weeklyStats } from '../store/stats'
import type { Session } from '../types/models'

export function HistoryPage() {
  const { store, catalog } = useAppData()
  const [sessions, setSessions] = useState<Session[]>([])
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])

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
    <div className="stack">
      <h1 className="page-title">기록</h1>
      {sessions.length === 0 && <p className="muted">완료된 세션이 아직 없어요.</p>}
      {groups.map(([date, list]) => (
        <section key={date} className="stack">
          <h2>{date}</h2>
          {list.map((s) => (
            <Link key={s.id} to={`/history/${s.id}`} className="card row">
              <div style={{ flex: 1 }}>
                <strong>{s.routineId ? '루틴 세션' : '자유운동'}</strong>
                <div className="muted">
                  {s.items.length}개 운동 · 볼륨 {sessionVolume(s)}kg
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {s.items
                    .slice(0, 3)
                    .map((i) => tKo(byId.get(i.exerciseId)?.name ?? i.exerciseId))
                    .join(', ')}
                </div>
              </div>
              <span className="muted">›</span>
            </Link>
          ))}
        </section>
      ))}
    </div>
  )
}

export function SessionDetailPage() {
  const { id } = useParams()
  const { store, catalog } = useAppData()
  const [session, setSession] = useState<Session | null>(null)
  const [previousByExercise, setPreviousByExercise] = useState<Map<string, number>>(new Map())
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog])

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
      <div className="stack">
        <p>기록을 찾을 수 없어요.</p>
        <Link to="/history">기록으로</Link>
      </div>
    )
  }

  return (
    <div className="stack">
      <Link to="/history" className="muted">
        ← 기록
      </Link>
      <h1 className="page-title">세션 상세</h1>
      <div className="card">
        <div className="muted">{formatDateKey(session.endedAt ?? session.startedAt)}</div>
        <strong>총 볼륨 {sessionVolume(session)} kg</strong>
      </div>
      {session.items.map((item) => {
        const ex = byId.get(item.exerciseId)
        const vol = exerciseVolume(item)
        const prev = previousByExercise.get(item.exerciseId)
        const delta = prev === undefined ? null : vol - prev
        return (
          <div key={`${item.exerciseId}-${item.order}`} className="card stack">
            <strong>{ex ? tKo(ex.name) : item.exerciseId}</strong>
            <div style={{ color: 'var(--accent)' }}>
              볼륨 {vol} kg
              {delta !== null && (
                <span style={{ color: delta >= 0 ? 'var(--ok)' : 'var(--danger)', marginLeft: 8 }}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}kg
                </span>
              )}
            </div>
            {item.sets.map((s) => (
              <div key={s.setNumber} className="muted">
                {s.setNumber} · {s.weightKg} kg × {s.reps}회
                {s.completed ? '' : ' (미완료)'}
              </div>
            ))}
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

  return (
    <div className="stack">
      <h1 className="page-title">통계</h1>
      <p className="muted">최근 7일</p>
      <div className="card stack">
        <div>
          <div className="muted">세션</div>
          <strong style={{ fontSize: '1.6rem' }}>{stats.sessionCount}</strong>
        </div>
        <div>
          <div className="muted">총 볼륨</div>
          <strong style={{ fontSize: '1.6rem', color: 'var(--accent)' }}>
            {stats.totalVolume} kg
          </strong>
        </div>
      </div>
    </div>
  )
}
