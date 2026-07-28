import { memo } from 'react'
import { NavLink } from 'react-router-dom'

export const BottomNav = memo(function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      <NavLink to="/" end>
        홈
      </NavLink>
      <NavLink to="/history">기록</NavLink>
      <NavLink to="/stats">통계</NavLink>
    </nav>
  )
})
