import { REST_PRESETS, clampRest, formatRest } from '../lib/rest'

interface RestFieldProps {
  /** Current effective rest duration in seconds. */
  seconds: number
  onChange: (seconds: number) => void
  label: string
  /** When true the shown value is the app default (no explicit override). */
  isDefault?: boolean
  /**
   * When provided, renders a "기본값" chip that clears the override so the
   * exercise follows the app-wide default again.
   */
  onUseDefault?: () => void
}

/**
 * Compact, accessible rest-duration control: preset chips + ±15s steppers.
 * Not a modal — inline block usable in settings, routine edit and sessions.
 */
export function RestField({ seconds, onChange, label, isDefault, onUseDefault }: RestFieldProps) {
  const value = clampRest(seconds)
  const set = (next: number) => onChange(clampRest(next))

  return (
    <div className="rest-field">
      <div className="rest-field-head">
        <span className="muted rest-field-label">{label}</span>
        <span className="rest-field-value" aria-live="polite">
          {formatRest(value)}
          {isDefault ? <span className="muted rest-field-default"> · 기본값</span> : null}
        </span>
      </div>
      <div className="rest-presets" role="group" aria-label={`${label} 프리셋`}>
        {onUseDefault && (
          <button
            type="button"
            className={`rest-chip interactive ${isDefault ? 'is-active' : ''}`}
            aria-pressed={isDefault ?? false}
            onClick={onUseDefault}
          >
            기본값
          </button>
        )}
        {REST_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`rest-chip interactive ${!isDefault && value === preset ? 'is-active' : ''}`}
            aria-pressed={!isDefault && value === preset}
            onClick={() => set(preset)}
          >
            {formatRest(preset)}
          </button>
        ))}
      </div>
      <div className="rest-steppers">
        <button
          type="button"
          className="btn btn-ghost interactive rest-step"
          aria-label={`${label} 15초 줄이기`}
          onClick={() => set(value - 15)}
        >
          −15초
        </button>
        <button
          type="button"
          className="btn btn-ghost interactive rest-step"
          aria-label={`${label} 15초 늘리기`}
          onClick={() => set(value + 15)}
        >
          +15초
        </button>
      </div>
    </div>
  )
}
