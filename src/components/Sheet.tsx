import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Fill most of the viewport; body scrolls internally */
  fill?: boolean
  labelledBy?: string
}

export function Sheet({ title, onClose, children, fill = false }: SheetProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className={fill ? 'sheet sheet-fill' : 'sheet sheet-auto'}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sheet-header row" style={{ justifyContent: 'space-between' }}>
          <h2>{title}</h2>
          <button type="button" className="btn btn-ghost interactive" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
