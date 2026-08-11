import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { playFinish, playSwitch, unlockCueSound, vibrate } from '../lib/cueSound'

/**
 * 휴식 카운트다운을 앱 전역 상태로 올린다.
 *
 * 왜 컨텍스트인가: 카운트다운을 **띄우는 곳**(세션 화면에서 세트를 완료할 때)과
 * **보여주는 곳**(<Routes> 바깥의 하단 고정 바)이 서로 다른 가지에 있다. 상태를
 * 공통 조상으로 끌어올려야 세션이 시작을 알리고 하단 바가 그걸 읽어 렌더한다.
 *
 * 신호음은 여기서 낸다 — 화면을 보지 않아도 휴식이 끝나가는 걸 알도록.
 * 남은 시간이 5초일 때 경고음, 0초에 종료음. 오디오는 사용자 제스처 안에서만
 * 열리므로 `startRest`(세트 완료 탭에서 호출됨)에서 한 번 unlock 한다.
 */

interface RestTimer {
  /** 휴식이 진행 중이라 하단 바를 띄워야 하는가. */
  active: boolean
  /** 남은 초. */
  remaining: number
  /** 이번 휴식의 전체 초 — 진행 막대에 쓴다. */
  total: number
  paused: boolean
  /** 세트 완료 시 호출 — 주어진 초로 카운트다운을 (재)시작한다. 0 이하면 무시. */
  startRest: (seconds: number) => void
  /** 진행 중인 카운트다운만 늘리거나 줄인다(프리셋/기본값은 건드리지 않음). */
  bump: (delta: number) => void
  togglePause: () => void
  /** 바를 닫고 카운트다운을 멈춘다. */
  dismiss: () => void
}

const RestTimerContext = createContext<RestTimer | null>(null)

/** 휴식이 끝난 뒤 "완료" 상태로 바가 잠깐 남았다 사라지기까지(ms). */
const LINGER_MS = 2000

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)
  const [paused, setPaused] = useState(false)
  const remainingRef = useRef(0)
  const hideTimer = useRef<number | null>(null)

  const clearHide = () => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const startRest = useCallback((seconds: number) => {
    unlockCueSound() // 반드시 실제 탭 안에서 — 그래야 5초·종료 신호음이 난다.
    if (!Number.isFinite(seconds) || seconds <= 0) return
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
    remainingRef.current = seconds
    setRemaining(seconds)
    setTotal(seconds)
    setPaused(false)
    setActive(true)
  }, [])

  const bump = useCallback((delta: number) => {
    const next = Math.max(0, remainingRef.current + delta)
    remainingRef.current = next
    setRemaining(next)
    // 0까지 갔다가 다시 시간을 준 경우, 전체 막대도 최소한 남은 만큼은 채운다.
    setTotal((t) => Math.max(t, next))
  }, [])

  const togglePause = useCallback(() => setPaused((p) => !p), [])

  const dismiss = useCallback(() => {
    clearHide()
    remainingRef.current = 0
    setActive(false)
    setPaused(false)
    setRemaining(0)
  }, [])

  useEffect(() => {
    if (!active || paused) return
    const id = window.setInterval(() => {
      const prev = remainingRef.current
      if (prev <= 0) return // 이미 끝났다 — 종료 신호가 반복되지 않도록.
      const next = prev - 1
      remainingRef.current = next
      setRemaining(next)

      if (next === 5) {
        playSwitch() // 5초 남음 — 또렷한 경고음.
        vibrate(30)
      } else if (next === 0) {
        playFinish() // 휴식 끝.
        vibrate([0, 80, 50, 120])
        hideTimer.current = window.setTimeout(() => {
          hideTimer.current = null
          setActive(false)
        }, LINGER_MS)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [active, paused])

  // 언마운트 시 대기 중인 타이머 정리.
  useEffect(() => () => clearHide(), [])

  const value: RestTimer = {
    active,
    remaining,
    total,
    paused,
    startRest,
    bump,
    togglePause,
    dismiss,
  }

  return <RestTimerContext.Provider value={value}>{children}</RestTimerContext.Provider>
}

export function useRestTimer(): RestTimer {
  const ctx = useContext(RestTimerContext)
  if (!ctx) throw new Error('useRestTimer must be used within a RestTimerProvider')
  return ctx
}
