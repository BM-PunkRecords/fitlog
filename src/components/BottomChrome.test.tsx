import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BottomChrome } from './BottomChrome'

afterEach(cleanup)

describe('BottomChrome', () => {
  it('registers no scroll/resize/visualViewport listeners', () => {
    const winSpy = vi.spyOn(window, 'addEventListener')
    const docSpy = vi.spyOn(document, 'addEventListener')

    render(
      <BottomChrome>
        <div>child</div>
      </BottomChrome>,
    )

    const registered = [...winSpy.mock.calls, ...docSpy.mock.calls].map((call) => call[0])
    for (const forbidden of ['scroll', 'resize', 'orientationchange', 'touchend', 'touchmove']) {
      expect(registered).not.toContain(forbidden)
    }

    winSpy.mockRestore()
    docSpy.mockRestore()
  })

  it('does not mutate an inline bottom style on the chrome node', () => {
    render(
      <BottomChrome>
        <div>child</div>
      </BottomChrome>,
    )

    const chrome = document.querySelector<HTMLElement>('.bottom-chrome')
    expect(chrome).not.toBeNull()
    // Position is CSS-only (dvh anchor); no JS-driven `bottom` mutation.
    expect(chrome!.style.bottom).toBe('')
    expect(chrome!.getAttribute('style')).toBeNull()
  })

  it('keeps a stable chrome/anchor DOM node across content rerenders', () => {
    const { rerender } = render(
      <BottomChrome>
        <div>first</div>
      </BottomChrome>,
    )
    const firstAnchor = document.querySelector('.bottom-anchor')
    const firstChrome = document.querySelector('.bottom-chrome')

    rerender(
      <BottomChrome>
        <div>second</div>
      </BottomChrome>,
    )

    expect(document.querySelector('.bottom-anchor')).toBe(firstAnchor)
    expect(document.querySelector('.bottom-chrome')).toBe(firstChrome)
  })
})
