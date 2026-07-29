import { useEffect, useState } from 'react'
import { formatDuration, parseDuration } from '../lib/metrics'
import { selectAll } from '../lib/selectOnFocus'

interface DurationFieldProps {
  seconds: number
  onSecondsChange: (seconds: number) => void
  ariaLabel: string
  className?: string
  /** Notified when the field gains focus (used to track the cascade start). */
  onFocus?: () => void
}

/**
 * `분:초` time input. Keeps a local draft while focused so typing is not
 * fought by re-formatting, then normalises to `m:ss` on blur. Selects the full
 * value on focus/tap.
 */
export function DurationField({
  seconds,
  onSecondsChange,
  ariaLabel,
  className = 'field',
  onFocus,
}: DurationFieldProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(() => (seconds > 0 ? formatDuration(seconds) : ''))

  useEffect(() => {
    if (!focused) setDraft(seconds > 0 ? formatDuration(seconds) : '')
  }, [seconds, focused])

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      placeholder="분:초"
      aria-label={ariaLabel}
      value={draft}
      onFocus={(e) => {
        setFocused(true)
        selectAll(e)
        onFocus?.()
      }}
      onClick={selectAll}
      onChange={(e) => {
        setDraft(e.target.value)
        onSecondsChange(parseDuration(e.target.value))
      }}
      onBlur={() => setFocused(false)}
    />
  )
}
