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

/**
 * 세트 한 줄 추가.
 *
 * 새 세트는 **바로 위 세트의 값을 그대로 물려받는다** — 같은 무게로 여러 세트를
 * 하는 게 보통이라 매번 다시 입력하게 만들 이유가 없다. 완료 표시는 당연히
 * 넘기지 않는다(아직 안 한 세트다).
 */
export function appendSet(item: SessionExercise): SessionExercise {
  const last = item.sets.at(-1)
  const next: SessionSet = {
    setNumber: item.sets.length + 1,
    weightKg: last?.weightKg ?? 0,
    reps: last?.reps ?? 0,
    completed: false,
  }
  if (last?.durationSec !== undefined) next.durationSec = last.durationSec
  if (last?.distanceKm !== undefined) next.distanceKm = last.distanceKm
  return { ...item, sets: [...item.sets, next] }
}

/** 이 운동의 세트를 전부 완료했는지. 세트가 없으면 완료로 보지 않는다. */
export function isExerciseComplete(item: SessionExercise): boolean {
  return item.sets.length > 0 && item.sets.every((s) => s.completed)
}

/**
 * 추천 루틴을 세션 항목으로 편다.
 *
 * 목표 횟수·시간은 **세트에 미리 채워 넣는다** — 화면에 "12회"라고 적어만 두면
 * 사용자가 그 숫자를 다시 입력해야 한다. 채워두면 그대로 하고 체크만 하거나,
 * 다르게 했으면 고치면 된다.
 *
 * 목표를 채운다고 완료로 표시하지는 않는다. 아직 하지 않은 운동이다.
 */
export function buildRecommendedSessionItems(
  items: {
    exerciseId: string
    displayName?: string
    sets?: number
    reps?: number
    durationSec?: number
  }[],
  defaultRestSeconds: number,
): SessionExercise[] {
  return items.map((item, order) => {
    const count = Math.max(1, item.sets ?? 1)
    const timed = item.durationSec !== undefined
    const sets: SessionSet[] = Array.from({ length: count }, (_, i) => {
      const set: SessionSet = {
        setNumber: i + 1,
        weightKg: 0,
        reps: item.reps ?? 0,
        completed: false,
      }
      if (timed) set.durationSec = item.durationSec
      return set
    })

    const exercise: SessionExercise = {
      exerciseId: item.exerciseId,
      order,
      sets,
      restSecondsDefault: defaultRestSeconds,
    }
    if (item.displayName) exercise.displayName = item.displayName
    // 시간으로 하는 운동은 기록 방식도 시간이어야 입력 칸이 맞는다.
    if (timed) exercise.metricType = 'duration'
    return exercise
  })
}
