import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { CHALLENGES } from '../data/challenges'
import { LocalWorkoutStore } from '../store/LocalWorkoutStore'

const AD_SCRIPT_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7426857657290789'

// Timer behaviour is independent of the video, and a challenge with an embed
// holds its start button until the player is ready — which never happens in
// jsdom. These tests therefore run against a video-less challenge.
const challenge = {
  ...CHALLENGES[0],
  id: 'test-no-video',
  youtubeId: undefined,
  portrait: undefined,
}

beforeEach(() => {
  indexedDB = new IDBFactory()
  CHALLENGES.push(challenge)
  window.history.pushState({}, '', `/challenges/${challenge.id}`)
  const script = document.createElement('script')
  script.src = AD_SCRIPT_SRC
  script.dataset.loaded = '1'
  document.head.appendChild(script)
  window.adsbygoogle = []
})

afterEach(() => {
  cleanup()
  const i = CHALLENGES.indexOf(challenge)
  if (i >= 0) CHALLENGES.splice(i, 1)
  document.querySelectorAll('script[src*="adsbygoogle.js"]').forEach((el) => el.remove())
  delete window.adsbygoogle
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('ChallengePlayPage', () => {
  it('previews every step and its length before starting', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: challenge.name })).toBeInTheDocument()
    for (const step of challenge.steps) {
      expect(screen.getAllByText(step.name).length).toBeGreaterThan(0)
    }
    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument()
  })

  // Browsers refuse to play audio unless it was set up inside a real gesture,
  // so the unlock has to happen on the start tap and not on mount.
  it('unlocks audio on the start tap', async () => {
    const resume = vi.fn()
    // jsdom has no AudioContext; a stub is enough to observe the unlock call.
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'suspended'
        resume = resume
        currentTime = 0
        destination = {}
        createOscillator() {
          return {
            type: '',
            frequency: { value: 0 },
            connect: () => ({ connect: () => undefined }),
            start: () => undefined,
            stop: () => undefined,
          }
        }
        createGain() {
          return {
            gain: {
              setValueAtTime: () => undefined,
              linearRampToValueAtTime: () => undefined,
            },
            connect: () => ({ connect: () => undefined }),
          }
        }
      },
    )

    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '시작' }))

    expect(resume).toHaveBeenCalled()
  })

  it('shows the running step, its countdown and what comes next', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '시작' }))

    // The first step is on screen with its full length showing.
    await waitFor(() =>
      expect(document.querySelector('.challenge-count')?.textContent).toBe(
        String(challenge.steps[0].seconds),
      ),
    )
    expect(document.querySelector('.challenge-name')?.textContent).toBe(challenge.steps[0].name)
    expect(document.querySelector('.challenge-next')?.textContent).toContain(
      challenge.steps[1].name,
    )
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument()
  })

  it('pauses and resumes without losing progress', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '시작' }))
    await user.click(await screen.findByRole('button', { name: '일시정지' }))

    expect(screen.getByRole('button', { name: '이어하기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '처음부터' })).toBeInTheDocument()
    // Still showing the current step rather than resetting to the plan.
    expect(document.querySelector('.challenge-name')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: '이어하기' }))
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument()
  })

  it('returns to the plan when reset', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '시작' }))
    await user.click(await screen.findByRole('button', { name: '일시정지' }))
    await user.click(screen.getByRole('button', { name: '처음부터' }))

    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument()
    expect(document.querySelector('.challenge-name')).toBeNull()
  })

  it('saves a completed session once the challenge ends', async () => {
    const saveSpy = vi.spyOn(LocalWorkoutStore.prototype, 'saveSession')
    const user = userEvent.setup()

    // Run the clock to just past the end instead of waiting a real minute.
    const total = challenge.steps.reduce((n, s) => n + s.seconds, 0)
    let fakeNow = 0
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow)

    render(<App />)
    await user.click(await screen.findByRole('button', { name: '시작' }))
    fakeNow = (total + 1) * 1000

    await waitFor(() => expect(screen.getByRole('button', { name: '한 번 더' })).toBeInTheDocument())
    await waitFor(() => expect(saveSpy).toHaveBeenCalled())

    const saved = saveSpy.mock.calls.at(-1)?.[0]
    expect(saved?.status).toBe('completed')
    expect(saved?.items).toHaveLength(challenge.steps.filter((s) => !s.rest).length)
    // Challenge work is timed, so it is recorded as duration, not weight/reps.
    expect(saved?.items[0].metricType).toBe('duration')
    expect(saved?.items[0].sets[0].durationSec).toBe(challenge.steps[0].seconds)
    expect(saved?.items[0].sets[0].completed).toBe(true)
  })
})

describe('ChallengePlayPage with a video', () => {
  // The bundled challenges have no video yet, so the behaviour is exercised
  // against a challenge that does.
  const withVideo = { ...challenge, id: 'video-challenge', youtubeId: 'abc123' }

  beforeEach(() => {
    CHALLENGES.push(withVideo)
    window.history.pushState({}, '', `/challenges/${withVideo.id}`)
  })

  afterEach(() => {
    const i = CHALLENGES.indexOf(withVideo)
    if (i >= 0) CHALLENGES.splice(i, 1)
  })

  it('renders the embed in a visible slot rather than hiding it', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: withVideo.name })

    const slot = document.querySelector('.challenge-video')
    expect(slot).not.toBeNull()
    // Hiding the player and using only its audio breaks the embed terms.
    expect(slot?.closest('[hidden]')).toBeNull()
  })

  it('holds the start button until the player is ready', async () => {
    render(<App />)
    // Starting before the player exists would run the clock with no video.
    const btn = await screen.findByRole('button', { name: '영상 준비 중…' })
    expect(btn).toBeDisabled()
  })

  // YouTube being blocked or offline must not make the challenge unusable —
  // it falls back to beeps rather than leaving the button locked forever.
  it('falls back to a beeps-only start when the player never arrives', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<App />)
    await screen.findByRole('button', { name: '영상 준비 중…' })

    await vi.advanceTimersByTimeAsync(4100)

    const btn = await screen.findByRole('button', { name: '시작' })
    expect(btn).toBeEnabled()
  })
})

describe('bundled challenge video wiring', () => {
  // Steps that map to a catalog exercise can show its form image; the ones the
  // catalog has no entry for stay text-only rather than showing a wrong image.
  it('links steps to catalog exercises where one exists', () => {
    const abs = CHALLENGES.find((c) => c.id === 'abs-1min')
    expect(abs?.steps[0].exerciseId).toBe('yo-mountain-climbers')

    const plank = CHALLENGES.find((c) => c.id === 'plank-challenge')
    expect(plank?.steps.every((s) => s.exerciseId)).toBe(true)
  })

  it('keeps every linked exercise resolvable in the catalog', async () => {
    const { loadCatalogWithAliases } = await import('../catalog/loadCatalog')
    const { buildExerciseIndex } = await import('../catalog/dedupe')
    const { catalog, aliases } = loadCatalogWithAliases()
    const index = buildExerciseIndex(catalog, aliases)

    for (const c of CHALLENGES) {
      for (const step of c.steps) {
        if (!step.exerciseId) continue
        expect(index.get(step.exerciseId), `${c.id} / ${step.name}`).toBeDefined()
      }
    }
  })

  it('plays the 1-minute abs challenge from its source short', () => {
    const abs = CHALLENGES.find((c) => c.id === 'abs-1min')
    expect(abs?.youtubeId).toBe('wJoOk3WCBGc')
    // Shorts are vertical; the player has to know or it letterboxes badly.
    expect(abs?.portrait).toBe(true)
    // Embedding someone's video means crediting it.
    expect(abs?.source).toContain('wJoOk3WCBGc')
  })
})

describe('ChallengeListPage', () => {
  it('lists the bundled challenges with their length', async () => {
    window.history.pushState({}, '', '/challenges')
    render(<App />)

    expect(await screen.findByRole('heading', { name: '챌린지' })).toBeInTheDocument()
    for (const c of CHALLENGES) {
      expect(screen.getAllByText(c.name).length).toBeGreaterThan(0)
    }
  })
})
