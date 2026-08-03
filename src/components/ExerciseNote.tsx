import { useEffect, useId, useRef, useState } from 'react'

/**
 * 운동별 메모 — 접혀 있다가 펼치면 쓰는 자유 입력.
 *
 * 기구 번호, 그날 자세 감각, 다음에 바꿀 것 같은 메모는 세트 숫자만으로는 남지
 * 않는다. 다만 운동 중 화면에서 자리를 크게 차지하면 방해가 되므로 기본은 접힌
 * 상태이고, 내용이 있으면 접힌 줄에 미리보기를 보여준다.
 *
 * 저장은 입력이 멈춘 뒤에 한 번만 한다 — 글자마다 IndexedDB에 쓰면 타이핑이
 * 끊긴다.
 */

interface Props {
  value: string
  onChange: (next: string) => void
}

const SAVE_DELAY_MS = 500

export function ExerciseNote({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const id = useId()
  const timer = useRef<number | undefined>(undefined)

  // 다른 운동으로 넘어가면 그 운동의 메모를 보여줘야 한다.
  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const edit = (next: string) => {
    setDraft(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onChange(next), SAVE_DELAY_MS)
  }

  // 접을 때는 기다리지 않고 즉시 저장한다(운동 전환으로 이어질 수 있다).
  const toggle = () => {
    if (open) {
      window.clearTimeout(timer.current)
      if (draft !== value) onChange(draft)
    }
    setOpen((v) => !v)
  }

  const preview = value.trim().split('\n')[0]

  return (
    <div className="exercise-note">
      <button
        type="button"
        className="note-toggle interactive"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={id}
      >
        <span className="note-caret" aria-hidden>
          {open ? '⌄' : '›'}
        </span>
        <span className="note-label">메모</span>
        {!open && preview && <span className="note-preview muted">{preview}</span>}
        {!open && !preview && <span className="note-preview muted">남기기</span>}
      </button>
      {open && (
        <textarea
          id={id}
          className="field note-input"
          value={draft}
          onChange={(e) => edit(e.target.value)}
          placeholder="기구 번호, 자세 느낌, 다음에 바꿀 것…"
          rows={3}
          aria-label="운동 메모"
        />
      )}
    </div>
  )
}
