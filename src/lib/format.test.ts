import { describe, expect, it } from 'vitest'
import { formatElapsed } from './format'

describe('formatElapsed', () => {
  it('formats under an hour as MM:SS', () => {
    expect(formatElapsed(0)).toBe('00:00')
    expect(formatElapsed(65_000)).toBe('01:05')
    expect(formatElapsed(3_599_000)).toBe('59:59')
  })

  it('formats an hour or more as H:MM:SS', () => {
    expect(formatElapsed(3_600_000)).toBe('1:00:00')
    expect(formatElapsed(3_661_000)).toBe('1:01:01')
  })
})
