import { describe, expect, it } from 'vitest'
import {
  SWIPE_MAX_DURATION,
  SWIPE_MIN_DISTANCE,
  detectSwipe,
  isSwipeExempt,
} from './swipe'

const start = { x: 200, y: 300, t: 1000 }

function end(dx: number, dy = 0, dt = 200) {
  return { x: start.x + dx, y: start.y + dy, t: start.t + dt }
}

describe('detectSwipe', () => {
  it('reads a decisive left drag as moving to the next exercise', () => {
    expect(detectSwipe(start, end(-120))).toBe('next')
  })

  it('reads a decisive right drag as moving to the previous exercise', () => {
    expect(detectSwipe(start, end(120))).toBe('prev')
  })

  it('ignores drags shorter than the distance threshold', () => {
    expect(detectSwipe(start, end(-(SWIPE_MIN_DISTANCE - 1)))).toBeNull()
    expect(detectSwipe(start, end(SWIPE_MIN_DISTANCE - 1))).toBeNull()
  })

  it('accepts a drag exactly at the threshold', () => {
    expect(detectSwipe(start, end(-SWIPE_MIN_DISTANCE))).toBe('next')
  })

  // The screen scrolls vertically, so anything that reads as a scroll must not
  // steal the gesture and jump to another exercise.
  it('ignores vertical scrolling', () => {
    expect(detectSwipe(start, end(0, -300))).toBeNull()
  })

  it('ignores diagonal drags where horizontal does not clearly dominate', () => {
    expect(detectSwipe(start, end(-100, 90))).toBeNull()
    expect(detectSwipe(start, end(-100, -90))).toBeNull()
  })

  it('accepts a horizontal drag with slight vertical drift', () => {
    expect(detectSwipe(start, end(-140, 20))).toBe('next')
  })

  it('ignores slow drags past the duration limit', () => {
    expect(detectSwipe(start, end(-200, 0, SWIPE_MAX_DURATION + 1))).toBeNull()
  })

  it('ignores a negative duration from a clock inconsistency', () => {
    expect(detectSwipe(start, end(-200, 0, -50))).toBeNull()
  })

  it('honours custom thresholds', () => {
    expect(detectSwipe(start, end(-30), { minDistance: 20 })).toBe('next')
  })
})

describe('isSwipeExempt', () => {
  it.each(['input', 'select', 'textarea', 'video'])(
    'exempts gestures starting on <%s>',
    (tag) => {
      const el = document.createElement(tag)
      expect(isSwipeExempt(el)).toBe(true)
    },
  )

  it('exempts descendants of an exempt element', () => {
    const wrap = document.createElement('div')
    wrap.innerHTML = '<video><span>inner</span></video>'
    const inner = wrap.querySelector('span')
    expect(isSwipeExempt(inner)).toBe(true)
  })

  it('exempts anything explicitly opted out', () => {
    const wrap = document.createElement('div')
    wrap.innerHTML = '<div data-no-swipe><span>inner</span></div>'
    expect(isSwipeExempt(wrap.querySelector('span'))).toBe(true)
  })

  it('allows plain content and buttons to swipe', () => {
    expect(isSwipeExempt(document.createElement('div'))).toBe(false)
    expect(isSwipeExempt(document.createElement('button'))).toBe(false)
  })

  it('handles a null or non-element target', () => {
    expect(isSwipeExempt(null)).toBe(false)
    expect(isSwipeExempt(document.createTextNode('x') as unknown as EventTarget)).toBe(false)
  })
})
