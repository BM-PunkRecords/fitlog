import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RestTimerProvider, useRestTimer } from './RestTimerContext'

// 신호음은 Web Audio를 합성한다 — 테스트에서는 호출 여부만 본다.
const playSwitch = vi.fn()
const playFinish = vi.fn()
vi.mock('../lib/cueSound', () => ({
  playSwitch: () => playSwitch(),
  playFinish: () => playFinish(),
  unlockCueSound: () => {},
  vibrate: () => {},
}))

function Harness() {
  const { active, remaining, startRest, bump, dismiss } = useRestTimer()
  return (
    <div>
      <span data-testid="active">{String(active)}</span>
      <span data-testid="remaining">{remaining}</span>
      <button type="button" onClick={() => startRest(10)}>
        start10
      </button>
      <button type="button" onClick={() => bump(15)}>
        plus15
      </button>
      <button type="button" onClick={dismiss}>
        dismiss
      </button>
    </div>
  )
}

function renderHarness() {
  return render(
    <RestTimerProvider>
      <Harness />
    </RestTimerProvider>,
  )
}

function tick(seconds: number) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000)
  })
}

function click(name: string) {
  act(() => {
    screen.getByText(name).click()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  playSwitch.mockClear()
  playFinish.mockClear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('RestTimerContext', () => {
  it('starts hidden and shows a countdown once a rest begins', () => {
    renderHarness()
    expect(screen.getByTestId('active')).toHaveTextContent('false')

    click('start10')
    expect(screen.getByTestId('active')).toHaveTextContent('true')
    expect(screen.getByTestId('remaining')).toHaveTextContent('10')

    tick(3)
    expect(screen.getByTestId('remaining')).toHaveTextContent('7')
  })

  it('beeps once at 5 seconds left and once when it hits zero', () => {
    renderHarness()
    click('start10')

    tick(4) // 10 -> 6
    expect(playSwitch).not.toHaveBeenCalled()

    tick(1) // 6 -> 5
    expect(playSwitch).toHaveBeenCalledTimes(1)
    expect(playFinish).not.toHaveBeenCalled()

    tick(5) // 5 -> 0
    expect(playFinish).toHaveBeenCalledTimes(1)
    expect(playSwitch).toHaveBeenCalledTimes(1)
  })

  it('does not re-fire the finish sound while sitting at zero', () => {
    renderHarness()
    click('start10')
    tick(10) // -> 0
    expect(playFinish).toHaveBeenCalledTimes(1)

    tick(5) // idle at 0
    expect(playFinish).toHaveBeenCalledTimes(1)
  })

  it('auto-hides a couple seconds after finishing', () => {
    renderHarness()
    click('start10')
    tick(10)
    expect(screen.getByTestId('active')).toHaveTextContent('true') // "휴식 완료" 잔상

    tick(2)
    expect(screen.getByTestId('active')).toHaveTextContent('false')
  })

  it('bump extends the running countdown', () => {
    renderHarness()
    click('start10')
    tick(3) // -> 7
    click('plus15') // -> 22
    expect(screen.getByTestId('remaining')).toHaveTextContent('22')
  })

  it('dismiss stops and hides immediately', () => {
    renderHarness()
    click('start10')
    tick(2)
    click('dismiss')
    expect(screen.getByTestId('active')).toHaveTextContent('false')
    expect(screen.getByTestId('remaining')).toHaveTextContent('0')
  })
})
