import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Pin the tab + ad chrome to the bottom of the *dynamic* viewport.
 *
 * Architecture (why this shape):
 * - A full-height fixed anchor sized with `100dvh` (CSS dynamic viewport)
 *   tracks the visible viewport bottom natively, so the chrome stays pinned
 *   as the mobile address bar shows/hides — no JS at all.
 * - The previous approach listened to visualViewport/window scroll and mutated
 *   `style.bottom` on every animation frame. During momentum scrolling that
 *   repeatedly moved/recomposited the AdSense iframe ancestor and blanked the
 *   creative. We deliberately register NO scroll/resize/visualViewport
 *   listeners and never touch inline styles here.
 * - The anchor is `pointer-events: none`; only the nav/ad inside it opt back
 *   into `pointer-events: auto`, so the app content behind stays clickable.
 * - Mounted once at the app root (outside <Routes>), so the <ins> and its
 *   iframe keep stable DOM identity across route changes and scrolling.
 */
export function BottomChrome({ children }: { children: ReactNode }) {
  return createPortal(
    <div className="bottom-anchor">
      <div className="bottom-chrome">{children}</div>
    </div>,
    document.body,
  )
}
