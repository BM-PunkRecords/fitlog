/**
 * 챌린지 신호음 — Web Audio로 그 자리에서 합성한다.
 *
 * 음원 파일을 번들하지 않는 이유는 두 가지다. 이 앱은 이미 초기 JS가 큰 PWA라
 * 오디오 자산을 더 얹고 싶지 않고, 무엇보다 **남의 음원을 앱에 실어 배포할 수
 * 없다**(공개 도메인에 광고까지 붙은 서비스다). 배경음악은 사용자가 원하는 것을
 * 따로 틀면 되고, 앱은 "언제 바뀌는가"만 알려준다 — 화면을 보지 않아도 되도록.
 *
 * 브라우저는 사용자 제스처 없이 소리를 못 낸다. `unlock()`을 시작 버튼 같은 실제
 * 탭 안에서 한 번 불러 두어야 이후 재생이 통과한다.
 */

type Ctx = AudioContext & { _fitlogUnlocked?: boolean }

let ctx: Ctx | null = null

function audioContext(): Ctx | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx ??= new Ctor() as Ctx
  return ctx
}

/** 사용자 제스처 안에서 한 번 호출 — 이후 자동 재생이 허용된다. */
export function unlockCueSound(): void {
  const ac = audioContext()
  if (!ac) return
  void ac.resume?.()
  ac._fitlogUnlocked = true
}

/** 짧은 사인파 한 번. 파일도, 외부 자원도 쓰지 않는다. */
function beep(freq: number, durationMs: number, gain = 0.15): void {
  const ac = audioContext()
  if (!ac || ac.state === 'closed') return

  try {
    const osc = ac.createOscillator()
    const amp = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq

    // 뚝 끊으면 딸깍 소리가 난다 — 짧게 올렸다 내린다.
    const now = ac.currentTime
    const dur = durationMs / 1000
    amp.gain.setValueAtTime(0, now)
    amp.gain.linearRampToValueAtTime(gain, now + 0.01)
    amp.gain.linearRampToValueAtTime(0, now + dur)

    osc.connect(amp).connect(ac.destination)
    osc.start(now)
    osc.stop(now + dur + 0.02)
  } catch {
    // 오디오가 막힌 환경에서도 챌린지 자체는 계속 돌아야 한다.
  }
}

/** 카운트다운(3·2·1) — 낮고 짧게. */
export function playCount(): void {
  beep(660, 90)
}

/** 동작 전환 — 한 옥타브 위로 또렷하게. */
export function playSwitch(): void {
  beep(990, 160, 0.2)
}

/** 완료 — 두 음을 이어 붙인 짧은 신호. */
export function playFinish(): void {
  beep(880, 140, 0.18)
  window.setTimeout(() => beep(1320, 260, 0.18), 150)
}

/** 진동은 소리를 못 켠 상황(무음 모드)의 보조 신호다. */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined') return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // 지원하지 않는 브라우저는 조용히 넘어간다.
  }
}
