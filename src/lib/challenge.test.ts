import { describe, expect, it } from 'vitest'
import {
  COUNT_IN_SECONDS,
  type Challenge,
  countInFor,
  cueAt,
  formatClock,
  positionAt,
  totalSeconds,
  videoStartFor,
} from './challenge'

const challenge: Challenge = {
  id: 'c1',
  name: '테스트 챌린지',
  steps: [
    { name: '동작 A', seconds: 10 },
    { name: '동작 B', seconds: 5 },
    { name: '동작 C', seconds: 15 },
  ],
}

describe('totalSeconds', () => {
  it('adds every step', () => {
    expect(totalSeconds(challenge)).toBe(30)
  })

  it('is zero for an empty challenge', () => {
    expect(totalSeconds({ id: 'x', name: 'x', steps: [] })).toBe(0)
  })
})

describe('positionAt', () => {
  it('starts on the first step', () => {
    const p = positionAt(challenge, 0)
    expect(p.index).toBe(0)
    expect(p.step?.name).toBe('동작 A')
    expect(p.next?.name).toBe('동작 B')
    expect(p.finished).toBe(false)
  })

  // A step that just began must read its full length, not one less, or the
  // countdown looks a beat behind.
  it('shows the full length at the moment a step begins', () => {
    expect(positionAt(challenge, 0).remainingInStep).toBe(10)
    expect(positionAt(challenge, 10).remainingInStep).toBe(5)
  })

  it('moves to the next step exactly on the boundary', () => {
    expect(positionAt(challenge, 9.9).step?.name).toBe('동작 A')
    expect(positionAt(challenge, 10).step?.name).toBe('동작 B')
    expect(positionAt(challenge, 15).step?.name).toBe('동작 C')
  })

  it('counts down within a step', () => {
    expect(positionAt(challenge, 7).remainingInStep).toBe(3)
    expect(positionAt(challenge, 9.5).remainingInStep).toBe(1)
  })

  it('reports the total remaining across steps', () => {
    expect(positionAt(challenge, 0).remainingTotal).toBe(30)
    expect(positionAt(challenge, 12).remainingTotal).toBe(18)
  })

  it('has no next step on the last one', () => {
    expect(positionAt(challenge, 20).next).toBeNull()
  })

  it('finishes at and past the end', () => {
    expect(positionAt(challenge, 30).finished).toBe(true)
    expect(positionAt(challenge, 99).finished).toBe(true)
    expect(positionAt(challenge, 30).step).toBeNull()
  })

  it('treats negative time as the start', () => {
    expect(positionAt(challenge, -5).index).toBe(0)
  })

  it('handles an empty challenge', () => {
    const p = positionAt({ id: 'x', name: 'x', steps: [] }, 0)
    expect(p.finished).toBe(true)
    expect(p.step).toBeNull()
  })
})

describe('cueAt', () => {
  it('signals a switch when a step begins', () => {
    expect(cueAt(challenge, 0)).toBe('switch')
    expect(cueAt(challenge, 10)).toBe('switch')
  })

  it('counts the last three seconds of a step', () => {
    expect(cueAt(challenge, 7)).toBe('count')
    expect(cueAt(challenge, 8)).toBe('count')
    expect(cueAt(challenge, 9)).toBe('count')
  })

  it('stays quiet in the middle of a step', () => {
    expect(cueAt(challenge, 3)).toBeNull()
    expect(cueAt(challenge, 5)).toBeNull()
  })

  it('signals the finish at the end', () => {
    expect(cueAt(challenge, 30)).toBe('finish')
    expect(cueAt(challenge, 31)).toBe('finish')
  })

  // A 3-second step begins and ends inside the countdown window; the switch
  // has to win so the start of a step is never announced as a countdown.
  it('prefers the switch cue when a short step begins', () => {
    const short: Challenge = { id: 'c', name: 'c', steps: [{ name: 'A', seconds: 3 }] }
    expect(cueAt(short, 0)).toBe('switch')
    expect(cueAt(short, 1)).toBe('count')
  })
})

describe('formatClock', () => {
  it('formats seconds as m:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(45)).toBe('0:45')
    expect(formatClock(60)).toBe('1:00')
    expect(formatClock(65)).toBe('1:05')
  })

  it('rounds up partial seconds and clamps negatives', () => {
    expect(formatClock(44.2)).toBe('0:45')
    expect(formatClock(-3)).toBe('0:00')
  })
})

describe('countInFor / videoStartFor', () => {
  const noVideo = { id: 'a', name: 'a', steps: [{ name: 'x', seconds: 10 }] }

  it('gives a plain challenge the full count-in', () => {
    expect(countInFor(noVideo)).toBe(COUNT_IN_SECONDS)
    expect(videoStartFor(noVideo)).toBe(0)
  })

  // The count-in lands inside the video's intro: the clip starts partway in so
  // the count reaches zero exactly where the exercise begins.
  it('lines the count-in up with the start of the exercise', () => {
    const c = { ...noVideo, youtubeId: 'v', youtubeStart: 5 }
    expect(countInFor(c)).toBe(COUNT_IN_SECONDS)
    expect(videoStartFor(c)).toBe(5 - COUNT_IN_SECONDS)
  })

  // Nothing to count against — a 2s intro cannot host a 3s count-in, so it
  // shrinks rather than starting the video at a negative offset.
  it('shortens the count-in when the intro is shorter', () => {
    const c = { ...noVideo, youtubeId: 'v', youtubeStart: 2 }
    expect(countInFor(c)).toBe(2)
    expect(videoStartFor(c)).toBe(0)
  })

  it('caps the count-in when the intro is long, starting mid-video', () => {
    const c = { ...noVideo, youtubeId: 'v', youtubeStart: 30 }
    expect(countInFor(c)).toBe(COUNT_IN_SECONDS)
    // 30s in, minus the count-in shown before it.
    expect(videoStartFor(c)).toBe(30 - COUNT_IN_SECONDS)
  })

  it('has no count-in when the video starts immediately', () => {
    const c = { ...noVideo, youtubeId: 'v' }
    expect(countInFor(c)).toBe(0)
    expect(videoStartFor(c)).toBe(0)
  })
})
