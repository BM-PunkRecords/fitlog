import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BottomAdBanner } from './BottomAdBanner'

const AD_SCRIPT_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7426857657290789'

afterEach(() => {
  cleanup()
  document.querySelectorAll('script[src*="adsbygoogle.js"]').forEach((el) => el.remove())
  delete window.adsbygoogle
})

beforeEach(() => {
  // Pretend the AdSense script is already loaded so waitForAdSenseScript resolves
  // immediately without appending a real network script during the test.
  const script = document.createElement('script')
  script.src = AD_SCRIPT_SRC
  script.dataset.loaded = '1'
  document.head.appendChild(script)
})

describe('BottomAdBanner', () => {
  it('pushes exactly once and keeps a stable slot node across rerenders', async () => {
    const pushed: unknown[] = []
    window.adsbygoogle = pushed

    const { rerender } = render(<BottomAdBanner />)

    await waitFor(() => expect(pushed.length).toBe(1))

    const firstSlot = document.querySelector('.adsbygoogle')
    expect(firstSlot).not.toBeNull()

    // Rerendering the parent must not remount the slot or push again.
    rerender(<BottomAdBanner />)
    await Promise.resolve()

    expect(document.querySelector('.adsbygoogle')).toBe(firstSlot)
    expect(pushed.length).toBe(1)
  })

  it('renders a fixed 320x50 slot (no auto / responsive attributes)', () => {
    window.adsbygoogle = []
    render(<BottomAdBanner />)

    const slot = document.querySelector<HTMLElement>('.adsbygoogle')
    expect(slot).not.toBeNull()
    expect(slot!.style.width).toBe('320px')
    expect(slot!.style.height).toBe('50px')
    expect(slot!.getAttribute('data-ad-format')).toBeNull()
    expect(slot!.getAttribute('data-full-width-responsive')).toBeNull()
  })
})
