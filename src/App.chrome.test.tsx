import 'fake-indexeddb/auto'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

const AD_SCRIPT_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7426857657290789'

beforeEach(() => {
  window.history.pushState({}, '', '/')
  const script = document.createElement('script')
  script.src = AD_SCRIPT_SRC
  script.dataset.loaded = '1'
  document.head.appendChild(script)
  window.adsbygoogle = []
})

afterEach(() => {
  cleanup()
  document.querySelectorAll('script[src*="adsbygoogle.js"]').forEach((el) => el.remove())
  delete window.adsbygoogle
})

function fireScrollBurst() {
  act(() => {
    for (let i = 0; i < 10; i += 1) {
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('resize'))
      window.visualViewport?.dispatchEvent(new Event('scroll'))
      window.visualViewport?.dispatchEvent(new Event('resize'))
      document.dispatchEvent(new Event('touchend'))
    }
  })
}

describe('App bottom chrome identity', () => {
  it('keeps the same .bottom-chrome and .adsbygoogle nodes across route changes and scrolling', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(document.querySelector('.bottom-chrome')).not.toBeNull()
      expect(document.querySelector('.adsbygoogle')).not.toBeNull()
    })

    const chrome = document.querySelector('.bottom-chrome')
    const anchor = document.querySelector('.bottom-anchor')
    const adSlot = document.querySelector('.adsbygoogle')

    // Simulated momentum scroll: the old JS approach mutated the ad ancestor
    // on these events. Node identity must be unaffected now.
    fireScrollBurst()
    expect(document.querySelector('.bottom-chrome')).toBe(chrome)
    expect(document.querySelector('.bottom-anchor')).toBe(anchor)
    expect(document.querySelector('.adsbygoogle')).toBe(adSlot)

    // Route change: chrome lives outside <Routes>, so it must not remount.
    await user.click(screen.getByRole('link', { name: '기록' }))
    await waitFor(() => expect(window.location.pathname).toBe('/history'))
    fireScrollBurst()

    await user.click(screen.getByRole('link', { name: '홈' }))
    await waitFor(() => expect(window.location.pathname).toBe('/'))

    expect(document.querySelector('.bottom-chrome')).toBe(chrome)
    expect(document.querySelector('.bottom-anchor')).toBe(anchor)
    expect(document.querySelector('.adsbygoogle')).toBe(adSlot)
    // The ad slot was pushed once and never re-pushed on rerenders.
    expect(window.adsbygoogle?.length).toBe(1)
  })
})
