import { APP_NAME } from '../types/models'

/**
 * App-level startup splash shown while AppData is still hydrating.
 *
 * Restrained FitLog brand mark centred in the dynamic viewport — wordmark, a
 * friendly Korean line, and a subtle three-dot pulse. Typography and spacing use
 * SEED Design foundation tokens (`--seed-font-size-*`, `--seed-dimension-*`),
 * while the colours stay on FitLog's dark slate + lime brand.
 *
 * The wordmark, tagline and dots are decorative (`aria-hidden`); the loading
 * state is announced once via a screen-reader-only Korean label under
 * `role="status"` / `aria-live="polite"`. Motion honours the global
 * `prefers-reduced-motion` rule.
 */
export function StartupSplash() {
  return (
    <div className="startup-splash" role="status" aria-live="polite">
      <span className="startup-splash-wordmark" aria-hidden="true">
        {APP_NAME}
      </span>
      <span className="startup-splash-tagline" aria-hidden="true">
        오늘 운동, 가볍게 시작해요
      </span>
      <span className="startup-dots" aria-hidden="true">
        <span className="startup-dot" />
        <span className="startup-dot" />
        <span className="startup-dot" />
      </span>
      <span className="sr-only">앱을 불러오는 중입니다</span>
    </div>
  )
}
