import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

const AD_CLIENT = 'ca-pub-7426857657290789'
const AD_SLOT = '1171291020'

function waitForAdSenseScript(): Promise<void> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    )

    if (existing) {
      if (existing.dataset.loaded === '1') {
        resolve()
        return
      }
      const done = () => {
        existing.dataset.loaded = '1'
        resolve()
      }
      existing.addEventListener('load', done, { once: true })
      existing.addEventListener('error', () => resolve(), { once: true })
      // Script may already be complete (from cache) without firing load again
      window.setTimeout(() => resolve(), 1500)
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = '1'
        resolve()
      },
      { once: true },
    )
    script.addEventListener('error', () => resolve(), { once: true })
    document.head.appendChild(script)
  })
}

export function BottomAdBanner() {
  const slotRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      await waitForAdSenseScript()
      if (cancelled || pushed.current) return
      const ins = slotRef.current
      if (!ins || ins.getAttribute('data-adsbygoogle-status')) {
        pushed.current = true
        return
      }
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        pushed.current = true
      } catch {
        // Ad blockers / offline
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="bottom-ad" aria-label="광고">
      <ins
        ref={slotRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
