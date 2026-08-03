import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChallengeVideo, type ChallengeVideoHandle } from '../components/ChallengeVideo'
import { ExercisePreview } from '../components/ExercisePreview'
import { EmptyState, PageHeader, SectionHeader } from '../components/primitives'
import { useAppData } from '../context/AppDataContext'
import { CHALLENGES, findChallenge } from '../data/challenges'
import {
  countInFor,
  formatClock,
  positionAt,
  totalSeconds,
  videoStartFor,
  type Challenge,
} from '../lib/challenge'
import { playCount, playFinish, playSwitch, unlockCueSound, vibrate } from '../lib/cueSound'
import { createId } from '../store/createId'
import type { Session } from '../types/models'

export function ChallengeListPage() {
  return (
    <div className="stack page-enter stagger">
      <PageHeader title="챌린지" description="정해진 시간에 맞춰 동작이 저절로 넘어가요" />
      <section className="stack">
        <SectionHeader title="추천 챌린지" aside={`${CHALLENGES.length}개`} />
        {CHALLENGES.length === 0 ? (
          <EmptyState title="아직 챌린지가 없어요" description="곧 추가될 예정이에요." />
        ) : (
          CHALLENGES.map((c) => (
            <Link key={c.id} to={`/challenges/${c.id}`} className="card stack challenge-card">
              <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
                <strong>{c.name}</strong>
                <span className="muted">{formatClock(totalSeconds(c))}</span>
              </div>
              {c.description && <span className="muted">{c.description}</span>}
              <span className="muted" style={{ fontSize: 12 }}>
                {c.steps.map((s) => s.name).join(' · ')}
              </span>
            </Link>
          ))
        )}
      </section>
      <Link to="/" className="muted interactive">
        ← 홈
      </Link>
    </div>
  )
}

type Phase = 'ready' | 'running' | 'paused' | 'done'

export function ChallengePlayPage() {
  const { id } = useParams()
  const challenge = id ? findChallenge(id) : undefined
  const { store, exerciseById, refresh } = useAppData()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('ready')
  const [elapsed, setElapsed] = useState(0)
  // 영상이 붙은 챌린지는 버튼을 누른 순간이 아니라 **실제 재생이 시작된 순간**
  // 타이머를 켠다. 앞광고가 붙으면 그만큼 어긋나기 때문.
  const [waitingVideo, setWaitingVideo] = useState(false)
  // 플레이어가 준비되기 전에 시작하면 영상 없이 타이머만 돌아 버린다 —
  // 준비될 때까지 시작 버튼을 잠근다.
  const [videoReady, setVideoReady] = useState(false)
  const videoRef = useRef<ChallengeVideoHandle | null>(null)
  // 같은 초에 신호가 두 번 울리지 않도록 마지막으로 울린 초를 기억한다.
  const lastCueSec = useRef<number>(-1)
  // 일시정지를 빼고 실제로 흐른 시간만 세기 위한 기준점.
  const startedAt = useRef<number>(0)
  const accumulated = useRef<number>(0)

  const total = challenge ? totalSeconds(challenge) : 0
  const countIn = challenge ? countInFor(challenge) : 0
  // 시계는 하나만 돌린다. 앞 `countIn`초는 준비 구간이고, 운동 경과는 그만큼 뺀
  // 값이다 — 두 개를 따로 세면 어긋날 자리가 생긴다.
  const workElapsed = elapsed - countIn
  const inCountIn = (phase === 'running' || phase === 'paused') && workElapsed < 0
  const countInLeft = Math.max(0, Math.ceil(-workElapsed))
  const pos = useMemo(
    () => (challenge ? positionAt(challenge, Math.max(0, workElapsed)) : null),
    [challenge, workElapsed],
  )

  useEffect(() => {
    if (phase !== 'running' || !challenge) return

    let raf = 0
    const tick = () => {
      const now = performance.now()
      const secs = (accumulated.current + (now - startedAt.current)) / 1000
      setElapsed(secs)

      // 신호는 초 단위로 한 번만.
      const whole = Math.floor(secs)
      if (whole !== lastCueSec.current) {
        lastCueSec.current = whole
        const work = secs - countIn
        if (work < 0) {
          // 준비 구간 — 매 초 카운트, 시작 직전엔 전환음으로 알린다.
          if (Math.ceil(-work) <= 1) {
            playSwitch()
            vibrate([0, 60, 40, 60])
          } else {
            playCount()
            vibrate(25)
          }
        } else {
          const p = positionAt(challenge, work)
          if (work >= total) {
            // 완료 신호는 아래 종료 처리에서 울린다.
          } else if (p.remainingInStep === p.step?.seconds) {
            playSwitch()
            vibrate([0, 60, 40, 60])
          } else if (p.remainingInStep <= 3) {
            playCount()
            vibrate(25)
          }
        }
      }

      if (secs - countIn >= total) {
        setPhase('done')
        playFinish()
        vibrate([0, 90, 60, 160])
        return
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, challenge, total, countIn])

  // 영상은 있으면 좋은 것이지 필수가 아니다. 유튜브가 막혔거나 오프라인이면
  // 플레이어 준비 신호가 영영 오지 않는데, 그렇다고 챌린지 자체를 시작조차 못
  // 하게 두면 안 된다 — 잠깐만 기다렸다가 신호음 모드로 풀어준다.
  useEffect(() => {
    if (!challenge?.youtubeId || videoReady) return
    const t = window.setTimeout(() => setVideoReady(true), 4000)
    return () => window.clearTimeout(t)
  }, [challenge?.youtubeId, videoReady])

  // 챌린지도 운동이다 — 끝내면 기록으로 남겨 통계에 잡히게 한다.
  useEffect(() => {
    if (phase !== 'done' || !challenge) return
    const now = new Date()
    const session: Session = {
      id: createId(),
      routineId: null,
      startedAt: new Date(now.getTime() - total * 1000).toISOString(),
      endedAt: now.toISOString(),
      status: 'completed',
      items: challenge.steps
        .filter((s) => !s.rest)
        .map((step, order) => ({
          exerciseId: step.exerciseId ?? `challenge:${challenge.id}:${order}`,
          order,
          metricType: 'duration' as const,
          sets: [{ setNumber: 1, weightKg: 0, reps: 0, durationSec: step.seconds, completed: true }],
        })),
    }
    void store.saveSession(session).then(() => refresh())
  }, [phase, challenge, total, store, refresh])

  if (!challenge) {
    return (
      <div className="stack page-enter">
        <p>챌린지를 찾을 수 없어요.</p>
        <Link to="/challenges">챌린지 목록</Link>
      </div>
    )
  }

  /** 타이머를 0부터 돌린다. 영상이 없거나, 영상이 실제로 재생되기 시작하면 호출. */
  const beginTimer = () => {
    accumulated.current = 0
    startedAt.current = performance.now()
    lastCueSec.current = -1
    setElapsed(0)
    setWaitingVideo(false)
    setPhase('running')
  }

  const start = () => {
    unlockCueSound() // 반드시 실제 탭 안에서 — 그래야 이후 소리가 난다.
    if (challenge.youtubeId && videoRef.current) {
      // 재생을 요청만 하고, 타이머는 onPlaying 신호를 받고 켠다.
      setWaitingVideo(true)
      videoRef.current.restart()
      return
    }
    beginTimer()
  }

  const pause = () => {
    accumulated.current += performance.now() - startedAt.current
    videoRef.current?.pause()
    setPhase('paused')
  }

  const resume = () => {
    startedAt.current = performance.now()
    videoRef.current?.play()
    setPhase('running')
  }

  const reset = () => {
    accumulated.current = 0
    lastCueSec.current = -1
    videoRef.current?.pause()
    setElapsed(0)
    setWaitingVideo(false)
    setPhase('ready')
  }

  const exercise = pos?.step?.exerciseId ? exerciseById.get(pos.step.exerciseId) : undefined
  const progress = total > 0 ? Math.min(1, Math.max(0, workElapsed) / total) : 0

  return (
    <div className="stack page-enter challenge-play">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Link to="/challenges" className="muted interactive">
          ← 챌린지
        </Link>
        <span className="muted">
          {phase === 'done' ? '완료' : formatClock(inCountIn ? total : (pos?.remainingTotal ?? total))}
        </span>
      </div>

      <h1 className="page-title">{challenge.name}</h1>

      {/* 영상은 늘 보이는 자리에 둔다 — 숨기고 소리만 쓰는 것은 임베드 약관 위반이고,
          보이는 편이 동작을 따라 하기에도 낫다. */}
      {challenge.youtubeId && (
        <ChallengeVideo
          youtubeId={challenge.youtubeId}
          startSeconds={videoStartFor(challenge)}
          portrait={challenge.portrait}
          onReady={(handle) => {
            videoRef.current = handle
            setVideoReady(true)
          }}
          onPlaying={() => {
            // 앞광고가 끝나고 본편이 시작된 순간에 맞춰 센다.
            if (waitingVideo || phase === 'ready') beginTimer()
            // 유튜브 컨트롤로 직접 재생한 경우 — 타이머도 같이 풀어야 어긋나지 않는다.
            else if (phase === 'paused') resume()
          }}
          onPaused={() => {
            if (phase === 'running') pause()
          }}
        />
      )}

      <div className="challenge-stage card stack">
        {phase === 'ready' && (
          <>
            <p className="muted">
              {challenge.steps.length}개 동작 · 총 {formatClock(total)}
            </p>
            <ol className="challenge-plan">
              {challenge.steps.map((s, i) => (
                <li key={`${s.name}-${i}`}>
                  <span>{s.name}</span>
                  <span className="muted">{s.seconds}초</span>
                </li>
              ))}
            </ol>
            <p className="muted" style={{ fontSize: 12 }}>
              {challenge.youtubeId
                ? '시작하면 영상이 함께 재생돼요. 동작이 바뀔 때 소리와 진동으로도 알려줘요.'
                : '음악은 원하는 걸 따로 틀어 두세요. 동작이 바뀔 때 소리와 진동으로 알려줘요.'}
            </p>
            {challenge.source && (
              <a
                className="muted interactive"
                style={{ fontSize: 12 }}
                href={challenge.source}
                target="_blank"
                rel="noreferrer noopener"
              >
                원본 영상 보기 ↗
              </a>
            )}
          </>
        )}

        {inCountIn && (
          <div className="stack challenge-countin" style={{ alignItems: 'center', gap: 8 }}>
            <span className="muted">시작까지</span>
            <div className="challenge-count is-countin" aria-hidden>
              {countInLeft}
            </div>
            <strong className="challenge-name">{challenge.steps[0]?.name}</strong>
            {challenge.steps[0]?.hint && (
              <span className="muted">{challenge.steps[0].hint}</span>
            )}
            <span className="sr-only" role="status">
              {countInLeft}초 뒤 시작합니다. 첫 동작 {challenge.steps[0]?.name}
            </span>
          </div>
        )}

        {!inCountIn && (phase === 'running' || phase === 'paused') && pos?.step && (
          <>
            <div className="challenge-count" aria-live="off">
              {pos.remainingInStep}
            </div>
            <div className="challenge-now">
              {exercise && <ExercisePreview exercise={exercise} size="hero" media="image" />}
              <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                <strong className="challenge-name">{pos.step.name}</strong>
                {pos.step.hint && <span className="muted">{pos.step.hint}</span>}
              </div>
            </div>
            <div className="challenge-bar" aria-hidden>
              <span style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="muted challenge-next">
              {pos.next ? `다음 · ${pos.next.name}` : '마지막 동작'}
            </div>
            {/* 스크린리더에는 초 단위 숫자 대신 동작 전환만 알린다. */}
            <span className="sr-only" role="status">
              {pos.step.name}
            </span>
          </>
        )}

        {phase === 'done' && (
          <div className="stack" style={{ alignItems: 'center', gap: 8 }}>
            <div className="challenge-count">완료</div>
            <p className="muted">기록에 저장했어요.</p>
          </div>
        )}
      </div>

      <div className="row challenge-actions">
        {phase === 'ready' && (
          <button
            type="button"
            className="btn btn-primary interactive"
            onClick={start}
            disabled={waitingVideo || (Boolean(challenge.youtubeId) && !videoReady)}
          >
            {waitingVideo || (challenge.youtubeId && !videoReady) ? '영상 준비 중…' : '시작'}
          </button>
        )}
        {phase === 'running' && (
          <button type="button" className="btn btn-ghost interactive" onClick={pause}>
            일시정지
          </button>
        )}
        {phase === 'paused' && (
          <>
            <button type="button" className="btn btn-primary interactive" onClick={resume}>
              이어하기
            </button>
            <button type="button" className="btn btn-quiet interactive" onClick={reset}>
              처음부터
            </button>
          </>
        )}
        {phase === 'done' && (
          <>
            <button type="button" className="btn btn-primary interactive" onClick={start}>
              한 번 더
            </button>
            <button
              type="button"
              className="btn btn-ghost interactive"
              onClick={() => navigate('/history')}
            >
              기록 보기
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export type { Challenge }
