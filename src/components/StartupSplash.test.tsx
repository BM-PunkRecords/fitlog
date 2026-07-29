import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StartupSplash } from './StartupSplash'
import { APP_NAME } from '../types/models'

afterEach(cleanup)

describe('StartupSplash', () => {
  it('exposes a polite status region with a Korean loading label', () => {
    render(<StartupSplash />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('앱을 불러오는 중입니다')
  })

  it('shows the FitLog wordmark and hides the decorative indicator', () => {
    const { container } = render(<StartupSplash />)

    const wordmark = screen.getByText(APP_NAME)
    expect(wordmark).toBeInTheDocument()
    expect(wordmark).toHaveAttribute('aria-hidden', 'true')

    const dots = container.querySelectorAll('.startup-dot')
    expect(dots).toHaveLength(3)
    expect(container.querySelector('.startup-dots')).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows a friendly Korean tagline as decorative copy', () => {
    render(<StartupSplash />)
    const tagline = screen.getByText('오늘 운동, 가볍게 시작해요')
    expect(tagline).toBeInTheDocument()
    expect(tagline).toHaveAttribute('aria-hidden', 'true')
  })

  it('avoids a generic visible loading string', () => {
    render(<StartupSplash />)
    expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument()
  })
})
