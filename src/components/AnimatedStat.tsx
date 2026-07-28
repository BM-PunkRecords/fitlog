import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  value: number
  className?: string
  children?: ReactNode
}

/** Pops the number when it changes for live feedback. */
export function AnimatedStat({ value, className = '', children }: Props) {
  const [bump, setBump] = useState(false)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current === value) return
    prev.current = value
    setBump(true)
    const id = window.setTimeout(() => setBump(false), 350)
    return () => window.clearTimeout(id)
  }, [value])

  return (
    <strong className={`stat-value ${bump ? 'is-updating' : ''} ${className}`.trim()}>
      {children ?? value}
    </strong>
  )
}
