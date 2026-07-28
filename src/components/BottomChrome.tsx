import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Pin tab+ad chrome to the visible viewport bottom.
 *
 * Important: update position via DOM (ref), never React setState — fast scroll
 * was re-rendering the AdSense tree and blanking the banner.
 */
export function BottomChrome({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const vv = window.visualViewport
    let raf = 0

    const apply = () => {
      raf = 0
      if (!vv) {
        el.style.bottom = '0px'
        return
      }
      // Gap between visual viewport bottom and layout viewport bottom
      const gap = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
      // Ignore single-frame spikes during momentum (iOS can report wild values)
      const next = Number.isFinite(gap) && gap < window.innerHeight ? gap : 0
      el.style.bottom = `${next}px`
    }

    const schedule = () => {
      if (raf) return
      raf = window.requestAnimationFrame(apply)
    }

    apply()
    vv?.addEventListener('resize', schedule)
    vv?.addEventListener('scroll', schedule)
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)
    // Re-sync when document momentum scroll settles
    window.addEventListener('scroll', schedule, { passive: true })
    document.addEventListener('touchend', schedule, { passive: true })

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      vv?.removeEventListener('resize', schedule)
      vv?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('orientationchange', schedule)
      window.removeEventListener('scroll', schedule)
      document.removeEventListener('touchend', schedule)
    }
  }, [])

  return createPortal(
    <div className="bottom-chrome" ref={ref}>
      {children}
    </div>,
    document.body,
  )
}
