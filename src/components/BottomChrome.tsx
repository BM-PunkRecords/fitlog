import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Keep bottom chrome pinned to the *visible* viewport on mobile Safari.
 * Plain `position:fixed; bottom:0` follows the layout viewport, so when the
 * URL bar collapses on scroll the bar can sit below the visible screen.
 */
function useVisualViewportBottomOffset(): number {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setOffset(hidden)
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return offset
}

export function BottomChrome({ children }: { children: ReactNode }) {
  const bottomOffset = useVisualViewportBottomOffset()
  const style = {
    '--chrome-bottom': `${bottomOffset}px`,
  } as CSSProperties

  return createPortal(
    <div className="bottom-chrome" style={style}>
      {children}
    </div>,
    document.body,
  )
}
