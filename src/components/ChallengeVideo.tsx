import { useEffect, useRef } from 'react'

/**
 * 챌린지 배경 영상 — YouTube IFrame Player.
 *
 * 음원을 앱에 번들하는 대신 원본 영상을 임베드한다. 재생은 유튜브에서 일어나고
 * 조회수·수익도 권리자에게 가므로, 남의 음원을 복제해 배포하는 문제가 없다.
 *
 * **영상은 반드시 보이는 상태로 둔다.** 숨겨 놓고 소리만 쓰는 것은 임베드 약관이
 * 금지한다. 가릴 이유도 없다 — 동작을 보면서 따라 할 수 있는 편이 낫다.
 *
 * 타이밍은 이 컴포넌트가 아니라 **실제 재생 시작(`onPlaying`)** 을 기준으로 맞춘다.
 * 영상 앞에 광고가 붙으면 버튼을 누른 시점과 소리가 나오는 시점이 어긋나기 때문.
 */

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  stopVideo: () => void
  destroy: () => void
}

interface YTEvent {
  data: number
  target: YTPlayer
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => YTPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

const API_SRC = 'https://www.youtube.com/iframe_api'
let apiPromise: Promise<void> | null = null

/** IFrame API를 한 번만 불러온다(스크립트는 외부 로드라 번들이 커지지 않는다). */
function loadApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  apiPromise ??= new Promise<void>((resolve) => {
    const existing = document.querySelector(`script[src="${API_SRC}"]`)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    if (!existing) {
      const script = document.createElement('script')
      script.src = API_SRC
      script.async = true
      document.head.appendChild(script)
    }
  })
  return apiPromise
}

export interface ChallengeVideoHandle {
  play: () => void
  pause: () => void
  restart: () => void
}

interface Props {
  youtubeId: string
  /** 시작 지점(초) — 영상 앞부분에 인사말이 있으면 건너뛴다. */
  startSeconds?: number
  /** 광고까지 끝나고 실제로 재생이 시작된 순간. 타이머는 여기에 맞춘다. */
  onPlaying?: () => void
  onPaused?: () => void
  onEnded?: () => void
  /** 플레이어 제어 핸들을 부모에게 넘긴다. */
  onReady?: (handle: ChallengeVideoHandle) => void
  /** 세로 영상(숏츠)이면 9:16으로 잡고 높이를 제한한다. */
  portrait?: boolean
}

export function ChallengeVideo({
  youtubeId,
  startSeconds = 0,
  onPlaying,
  onPaused,
  onEnded,
  onReady,
  portrait = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  // 콜백을 ref에 담아 두면 부모가 리렌더돼도 플레이어를 다시 만들지 않는다.
  const cb = useRef({ onPlaying, onPaused, onEnded, onReady })
  cb.current = { onPlaying, onPaused, onEnded, onReady }

  useEffect(() => {
    let cancelled = false

    void loadApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT?.Player) return

      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId: youtubeId,
        playerVars: {
          start: startSeconds,
          playsinline: 1, // iOS에서 전체화면으로 튀지 않게
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e: YTEvent) => {
            cb.current.onReady?.({
              play: () => e.target.playVideo(),
              pause: () => e.target.pauseVideo(),
              restart: () => {
                e.target.seekTo(startSeconds, true)
                e.target.playVideo()
              },
            })
          },
          onStateChange: (e: YTEvent) => {
            const S = window.YT?.PlayerState
            if (!S) return
            if (e.data === S.PLAYING) cb.current.onPlaying?.()
            else if (e.data === S.PAUSED) cb.current.onPaused?.()
            else if (e.data === S.ENDED) cb.current.onEnded?.()
          },
        },
      })
    })

    return () => {
      cancelled = true
      try {
        playerRef.current?.destroy()
      } catch {
        // 이미 사라진 iframe이면 무시한다.
      }
      playerRef.current = null
    }
  }, [youtubeId, startSeconds])

  return (
    <div className={`challenge-video ${portrait ? 'is-portrait' : ''}`.trim()}>
      <div ref={hostRef} />
    </div>
  )
}
