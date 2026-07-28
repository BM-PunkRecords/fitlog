import { Link } from 'react-router-dom'
import type { Session } from '../types/models'

interface Props {
  session: Session
  onDiscard: () => void
}

export function ResumeBanner({ session, onDiscard }: Props) {
  return (
    <div className="banner stack">
      <strong>진행 중인 운동이 있어요</strong>
      <span className="muted">이어서 기록하거나 폐기할 수 있어요.</span>
      <div className="row">
        <Link className="btn btn-primary" to={`/session/${session.id}`}>
          이어하기
        </Link>
        <button type="button" className="btn btn-ghost" onClick={onDiscard}>
          폐기
        </button>
      </div>
    </div>
  )
}
