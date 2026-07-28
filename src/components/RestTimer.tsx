import { useEffect, useRef, useState } from 'react'

interface Props {
  initialSeconds: number
  restartToken: number
  onAdjustDefault?: (seconds: number) => void
}

export function RestTimer({ initialSeconds, restartToken, onAdjustDefault }: Props) {
  const [remaining, setRemaining] = useState(initialSeconds)
  const [paused, setPaused] = useState(false)
  const remainingRef = useRef(remaining)
  remainingRef.current = remaining

  useEffect(() => {
    setRemaining(initialSeconds)
    setPaused(false)
  }, [restartToken, initialSeconds])

  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => {
      if (remainingRef.current <= 0) return
      setRemaining((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [paused, restartToken])

  const bump = (delta: number) => {
    setRemaining((s) => Math.max(0, s + delta))
    onAdjustDefault?.(Math.max(15, initialSeconds + delta))
  }

  return (
    <div className="card stack">
      <div className="muted">휴식 시간</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>
        {remaining} 초
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" onClick={() => bump(-15)}>
          −15
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => bump(15)}>
          +15
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setPaused((p) => !p)}>
          {paused ? '재개' : '일시정지'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setRemaining(initialSeconds)
            setPaused(false)
          }}
        >
          리셋
        </button>
      </div>
    </div>
  )
}
