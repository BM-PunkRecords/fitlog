import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

const AD_CLIENT = 'ca-pub-7426857657290789'
const AD_SLOT = '1171291020'

export function BottomAdBanner() {
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch {
      // AdSense may be blocked by extensions / offline
    }
  }, [])

  return (
    <div className="bottom-ad" aria-label="광고">
      <ins
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
