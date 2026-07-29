import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { BottomNav } from './BottomNav'

afterEach(cleanup)

function renderNav(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  )
}

describe('BottomNav accessibility', () => {
  it('marks only the current route with aria-current="page"', () => {
    renderNav('/history')

    const active = screen.getByRole('link', { name: '기록' })
    expect(active).toHaveAttribute('aria-current', 'page')

    expect(screen.getByRole('link', { name: '홈' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: '통계' })).not.toHaveAttribute('aria-current')
  })

  it('marks Home current on the root route (exact match only)', () => {
    renderNav('/')
    expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '기록' })).not.toHaveAttribute('aria-current')
  })

  it('exposes every destination as a focusable link inside a labelled nav', () => {
    renderNav('/')
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toBeInTheDocument()
    for (const name of ['홈', '기록', '통계']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href')
    }
  })
})
