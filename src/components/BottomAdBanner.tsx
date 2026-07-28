import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

const AD_CLIENT = 'ca-pub-7426857657290789'
const AD_SLOT = '1171291020'

function pushAd(ins: HTMLElement) {
  // Avoid double-init on the same <ins>
  if (ins.getAttribute('data-adsbygoogle-status')) return false
  try {
    ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    return true
  } catch {
    return false
  }
}

export function BottomAdBanner() {
  const slotRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    const ins = slotRef.current
    if (!ins || pushed.current) return

    const tryPush = () => {
      if (pushed.current || !slotRef.current) return
      if (pushAd(slotRef.current)) {
        pushed.current = true
      }
    }

    tryPush()

    // Script is async — retry until loaded or give up after ~8s
    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1
      tryPush()
      if (pushed.current || attempts >= 16) {
        window.clearInterval(timer)
      }
    }, 500)

    const script = document.querySelector<HTMLScriptElement>(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    )
    const onLoad = () => tryPush()
    script?.addEventListener('load', onLoad)

    return () => {
      window.clearInterval(timer)
      script?.removeEventListener('load', onLoad)
    }
  }, [])

  return (
    <div className="bottom-ad" aria-label="광고">
      <ins
        ref={slotRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '60px', maxHeight: '60px' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        data-ad-format="horizontal"
        data-full-width-responsive="false"
      />
    </div>
  )
}
