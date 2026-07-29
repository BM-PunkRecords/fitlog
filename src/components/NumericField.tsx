import { selectAll } from '../lib/selectOnFocus'

interface NumericFieldProps {
  value: number
  onValueChange: (value: number) => void
  ariaLabel: string
  placeholder?: string
  /** Allow decimal entry (weight, distance). */
  decimal?: boolean
  className?: string
  /** Notified when the field gains focus (used to track the cascade start). */
  onFocus?: () => void
}

/**
 * Numeric input that selects its full value on focus/tap so the next keystroke
 * replaces it. `0` renders as an empty field.
 */
export function NumericField({
  value,
  onValueChange,
  ariaLabel,
  placeholder,
  decimal = false,
  className = 'field',
  onFocus,
}: NumericFieldProps) {
  return (
    <input
      className={className}
      type="number"
      min={0}
      step={decimal ? 'any' : 1}
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onValueChange(Number(e.target.value) || 0)}
      onFocus={(e) => {
        selectAll(e)
        onFocus?.()
      }}
      onClick={selectAll}
    />
  )
}
