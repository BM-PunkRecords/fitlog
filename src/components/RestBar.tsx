import { useRestTimer } from '../context/RestTimerContext'

/**
 * 휴식 카운트다운을 하단 탭 바로 위에 도킹한다. 세트를 채우며 화면을 스크롤해도
 * 남은 시간이 늘 눈에 있어야 하기 때문 — 페이지 안에 있으면 스크롤에 밀려 사라진다.
 *
 * 휴식이 없을 때는 렌더하지 않아 평소 탭 바 높이를 그대로 둔다.
 */
export function RestBar() {
  const { active, remaining, total, paused, bump, togglePause, dismiss } = useRestTimer()

  if (!active) return null

  const done = remaining <= 0
  const urgent = !done && remaining <= 5
  const progress = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0

  return (
    <div
      className={`rest-bar ${urgent ? 'is-urgent' : ''} ${done ? 'is-done' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="rest-bar-track" aria-hidden>
        <span className="rest-bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="rest-bar-row">
        <div className="rest-bar-count">
          <span className="rest-bar-label">{done ? '휴식 완료' : '휴식'}</span>
          {!done && (
            <span className="rest-bar-value">
              <strong>{remaining}</strong>초
            </span>
          )}
        </div>
        {done ? (
          <button
            type="button"
            className="btn btn-ghost interactive rest-bar-btn"
            onClick={dismiss}
          >
            닫기
          </button>
        ) : (
          <div className="rest-bar-actions">
            <button
              type="button"
              className="btn btn-ghost interactive rest-bar-btn"
              onClick={() => bump(-15)}
              aria-label="휴식 15초 줄이기"
            >
              −15
            </button>
            <button
              type="button"
              className="btn btn-ghost interactive rest-bar-btn"
              onClick={() => bump(15)}
              aria-label="휴식 15초 늘리기"
            >
              +15
            </button>
            <button
              type="button"
              className="btn btn-ghost interactive rest-bar-btn"
              onClick={togglePause}
            >
              {paused ? '재개' : '일시정지'}
            </button>
            <button
              type="button"
              className="icon-btn interactive rest-bar-close"
              onClick={dismiss}
              aria-label="휴식 타이머 닫기"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
