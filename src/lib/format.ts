import type { Exercise } from '../catalog/types'
import type { Routine, Session, SessionExercise, SessionSet } from '../types/models'
import { targetKo } from './labelsKo'
import { routineRestFor } from './rest'

export function emptySets(count = 3): SessionSet[] {
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    weightKg: 0,
    reps: 0,
    completed: false,
  }))
}

export function sessionItemFromExercise(
  exerciseId: string,
  order: number,
  restSecondsDefault?: number,
): SessionExercise {
  return {
    exerciseId,
    order,
    sets: emptySets(3),
    restSecondsDefault,
  }
}

/**
 * Build the session items for a routine, copying each exercise's *effective*
 * rest (per-exercise override when set, else the app default) into
 * `SessionExercise.restSecondsDefault`. Legacy routines without per-exercise
 * config simply get the app default on every item.
 */
export function buildRoutineSessionItems(
  routine: Pick<Routine, 'exerciseIds' | 'restByExerciseId'>,
  defaultRestSeconds: number,
): SessionExercise[] {
  return routine.exerciseIds.map((exerciseId, order) =>
    sessionItemFromExercise(
      exerciseId,
      order,
      routineRestFor(routine, exerciseId, defaultRestSeconds),
    ),
  )
}

/**
 * Return a new session with the rest duration of a single exercise (by index)
 * changed. Pure: other exercises and the original session are untouched.
 */
export function setSessionExerciseRest(
  session: Session,
  index: number,
  seconds: number,
): Session {
  return {
    ...session,
    items: session.items.map((item, i) =>
      i === index ? { ...item, restSecondsDefault: seconds } : item,
    ),
  }
}

export function relativeTime(iso?: string): string {
  if (!iso) return '아직 없음'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

export function routineTargets(
  exerciseIds: string[],
  byId: Map<string, Exercise>,
): string {
  const targets = [
    ...new Set(
      exerciseIds
        .map((id) => byId.get(id)?.target)
        .filter((t): t is string => Boolean(t))
        .map((t) => targetKo(t)),
    ),
  ]
  return targets.slice(0, 3).join(', ') || '운동 구성'
}

export function formatDateKey(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

/** Elapsed workout time: `MM:SS` or `H:MM:SS` */
export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}

/** Numeric set fields a single row edit can write. */
export type EditableSetFields = Partial<
  Pick<SessionSet, 'weightKg' | 'reps' | 'durationSec' | 'distanceKm'>
>

/** Set-entry mode: edit one row, or cascade the edit to rows below. */
export type EntryMode = 'individual' | 'bulk'

/**
 * Apply a field edit made on the set `fromSetNumber`.
 *
 * - `individual`: only that row changes (default per-row editing).
 * - `bulk`: the edited value cascades to that row and every row below it
 *   (higher `setNumber`).
 *
 * Only the provided keys are written, so completion flags and other fields on
 * the affected rows are left untouched.
 */
export function applyRowEdit(
  item: SessionExercise,
  fromSetNumber: number,
  fields: EditableSetFields,
  mode: EntryMode,
): SessionExercise {
  return {
    ...item,
    sets: item.sets.map((set) => {
      const inRange =
        mode === 'bulk' ? set.setNumber >= fromSetNumber : set.setNumber === fromSetNumber
      return inRange ? { ...set, ...fields } : set
    }),
  }
}

/**
 * 기록에 남은 운동의 표시 이름.
 *
 * 카탈로그에 있으면 그 이름(한글)을, 없으면 기록 시점에 박아 둔 `displayName`을
 * 쓴다. 둘 다 없을 때만 내부 id가 보이는데, 그건 데이터가 깨진 경우다 — 챌린지
 * 동작처럼 카탈로그에 없는 항목이 `challenge:abs-1min:1` 같은 식별자로 노출되던
 * 버그를 막기 위한 순서다.
 */
export function sessionItemName(
  item: { exerciseId: string; displayName?: string },
  byId: Map<string, { name: string }>,
  translate: (name: string) => string,
): string {
  const ex = byId.get(item.exerciseId)
  if (ex) return translate(ex.name)
  return item.displayName ?? item.exerciseId
}
