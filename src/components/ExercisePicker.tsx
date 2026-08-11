import { useEffect, useMemo, useRef, useState } from 'react'
import { searchExercises } from '../catalog/searchExercises'
import type { Exercise } from '../catalog/types'
import { useAppData } from '../context/AppDataContext'
import { bodyPartKo, equipmentKo, targetKo } from '../lib/labelsKo'
import { tKo } from '../lib/tKo'
import { createId } from '../store/createId'
import type { CustomExercise } from '../types/models'
import { BODY_REGIONS, BodyPartPicker, regionForBodyPart } from './BodyPartPicker'
import { ExercisePreview } from './ExercisePreview'

type StatusFilter = 'all' | 'favorite' | 'frequent' | 'recent' | 'custom'

interface Props {
  catalog: Exercise[]
  onPick: (exercise: Exercise) => void
  onClose?: () => void
  excludeIds?: string[]
  preferBodyPart?: string
}

const BODY_CHIP_ORDER = [
  'chest',
  'back',
  'shoulders',
  'upper arms',
  'upper legs',
  'waist',
  'hips',
  'lower legs',
  'cardio',
]

const EQUIP_CHIP_ORDER = [
  'body weight',
  'dumbbell',
  'barbell',
  'cable',
  'smith machine',
  'band',
  'kettlebell',
  'leverage machine',
]

function muscleLine(ex: Exercise): string {
  const parts = [targetKo(ex.target)]
  for (const m of ex.secondaryMuscles ?? []) {
    const label = targetKo(m)
    if (label && !parts.includes(label)) parts.push(label)
    if (parts.length >= 2) break
  }
  return parts.join(', ')
}

export function ExercisePicker({
  catalog,
  onPick,
  onClose,
  excludeIds = [],
  preferBodyPart,
}: Props) {
  const {
    recentExerciseIds,
    frequentExerciseIds,
    settings,
    toggleFavorite,
    saveCustomExercise,
    removeCustomExercise,
  } = useAppData()
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [bodyPart, setBodyPart] = useState(preferBodyPart ?? '')
  const [equipment, setEquipment] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [showTop, setShowTop] = useState(false)
  const [customName, setCustomName] = useState('')
  const defaultRegion = regionForBodyPart(preferBodyPart) ?? BODY_REGIONS[0]
  const [customRegion, setCustomRegion] = useState(defaultRegion.key)
  const [customBodyPart, setCustomBodyPart] = useState(defaultRegion.bodyPart)
  const [customTarget, setCustomTarget] = useState(defaultRegion.target)
  const [customEquipment, setCustomEquipment] = useState('barbell')
  const [customError, setCustomError] = useState('')

  useEffect(() => {
    if (preferBodyPart) setBodyPart(preferBodyPart)
  }, [preferBodyPart])

  const favorites = settings.favoriteExerciseIds ?? []
  const favoriteSet = useMemo(() => new Set(favorites), [favorites])
  const recentSet = useMemo(() => new Set(recentExerciseIds), [recentExerciseIds])
  const frequentSet = useMemo(() => new Set(frequentExerciseIds), [frequentExerciseIds])

  const bodyParts = useMemo(() => {
    const present = new Set(catalog.map((e) => e.bodyPart))
    const ordered = BODY_CHIP_ORDER.filter((p) => present.has(p))
    const rest = [...present].filter((p) => !ordered.includes(p)).sort()
    return [...ordered, ...rest]
  }, [catalog])

  const equipments = useMemo(() => {
    const present = new Set(catalog.map((e) => e.equipment))
    const ordered = EQUIP_CHIP_ORDER.filter((e) => present.has(e))
    const rest = [...present].filter((e) => !ordered.includes(e)).sort()
    return [...ordered, ...rest]
  }, [catalog])

  const results = useMemo(() => {
    const excluded = new Set(excludeIds)
    let list = searchExercises(catalog, query, {
      bodyPart: bodyPart || undefined,
      equipment: equipment || undefined,
    }).filter((e) => !excluded.has(e.id))

    if (status === 'custom') list = list.filter((e) => e.source === 'custom')
    else if (status === 'favorite') list = list.filter((e) => favoriteSet.has(e.id))
    else if (status === 'frequent') {
      list = list.filter((e) => frequentSet.has(e.id))
      list.sort(
        (a, b) => frequentExerciseIds.indexOf(a.id) - frequentExerciseIds.indexOf(b.id),
      )
    } else if (status === 'recent') {
      list = list.filter((e) => recentSet.has(e.id))
      list.sort(
        (a, b) => recentExerciseIds.indexOf(a.id) - recentExerciseIds.indexOf(b.id),
      )
    }

    return list
  }, [
    catalog,
    query,
    bodyPart,
    equipment,
    excludeIds,
    status,
    favoriteSet,
    frequentSet,
    recentSet,
    frequentExerciseIds,
    recentExerciseIds,
  ])

  const saveCustom = async () => {
    const name = customName.trim()
    if (!name) {
      setCustomError('운동 이름을 입력하세요')
      return
    }
    setCustomError('')
    const row: CustomExercise = {
      id: `custom-${createId()}`,
      name,
      bodyPart: customBodyPart,
      target: customTarget,
      equipment: customEquipment,
      createdAt: new Date().toISOString(),
    }
    await saveCustomExercise(row)
    setShowCustomForm(false)
    setCustomName('')
    setStatus('custom')
    onPick({
      id: row.id,
      name: row.name,
      bodyPart: row.bodyPart,
      target: row.target,
      secondaryMuscles: [],
      equipment: row.equipment,
      difficulty: 'intermediate',
      steps: [],
      formCues: [],
      commonMistakes: [],
      videos: {},
      thumbnails: {},
      source: 'custom',
    })
  }

  return (
    <div className="exercise-picker">
      <div className="picker-topbar">
        {onClose ? (
          <button
            type="button"
            className="picker-icon-btn"
            aria-label="뒤로"
            onClick={onClose}
          >
            ←
          </button>
        ) : (
          <span className="picker-icon-spacer" />
        )}
        <div className="picker-search">
          <span className="picker-search-icon" aria-hidden>
            ⌕
          </span>
          <input
            className="picker-search-input"
            placeholder="운동 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="picker-icon-btn picker-plus-btn"
          aria-label="커스텀 운동 추가"
          onClick={() => setShowCustomForm((v) => !v)}
        >
          +
        </button>
      </div>

      <div className="chip-row" role="tablist" aria-label="목록 필터">
        {(
          [
            ['all', '전체'],
            ['favorite', '좋아하는'],
            ['frequent', '자주하는'],
            ['recent', '최근'],
            ['custom', '커스텀'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={status === id}
            className={`chip ${status === id ? 'is-active' : ''}`}
            onClick={() => setStatus(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="chip-row" role="listbox" aria-label="부위 필터">
        <button
          type="button"
          className={`chip chip-secondary ${bodyPart === '' ? 'is-active' : ''}`}
          onClick={() => setBodyPart('')}
        >
          전체
        </button>
        {bodyParts.map((part) => (
          <button
            key={part}
            type="button"
            className={`chip chip-secondary ${bodyPart === part ? 'is-active' : ''}`}
            onClick={() => setBodyPart(part)}
          >
            {bodyPartKo(part)}
          </button>
        ))}
      </div>

      <div className="chip-row" role="listbox" aria-label="장비 필터">
        <button
          type="button"
          className={`chip chip-secondary ${equipment === '' ? 'is-active' : ''}`}
          onClick={() => setEquipment('')}
        >
          전체
        </button>
        {equipments.map((eq) => (
          <button
            key={eq}
            type="button"
            className={`chip chip-secondary ${equipment === eq ? 'is-active' : ''}`}
            onClick={() => setEquipment(eq)}
          >
            {equipmentKo(eq)}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="custom-add-link interactive"
        onClick={() => setShowCustomForm((v) => !v)}
      >
        <span className="custom-add-dot">+</span>
        커스텀 운동 추가
      </button>

      {showCustomForm && (
        <div className="card stack custom-form">
          <input
            className="field"
            placeholder="운동 이름"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <div className="stack" style={{ gap: 8 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              어느 부위 운동인가요? 그림을 눌러 고르세요
            </span>
            <BodyPartPicker
              value={customRegion}
              onSelect={(r) => {
                setCustomRegion(r.key)
                setCustomBodyPart(r.bodyPart)
                setCustomTarget(r.target)
              }}
            />
          </div>
          <select
            className="field"
            value={customEquipment}
            onChange={(e) => setCustomEquipment(e.target.value)}
            aria-label="장비"
          >
            {equipments.map((eq) => (
              <option key={eq} value={eq}>
                {equipmentKo(eq)}
              </option>
            ))}
          </select>
          {customError && <p className="error-text">{customError}</p>}
          <div className="row">
            <button
              type="button"
              className="btn btn-primary interactive"
              onClick={() => void saveCustom()}
            >
              저장하고 담기
            </button>
            <button
              type="button"
              className="btn btn-ghost interactive"
              onClick={() => setShowCustomForm(false)}
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div
        className="exercise-picker-list"
        ref={listRef}
        onScroll={(e) => setShowTop(e.currentTarget.scrollTop > 240)}
      >
        {results.length === 0 && (
          <p className="muted" style={{ padding: '12px 4px' }}>
            {status === 'favorite'
              ? '좋아하는 운동이 없어요. 하트를 눌러 추가하세요.'
              : status === 'frequent'
                ? '자주 한 운동이 아직 없어요.'
                : status === 'recent'
                  ? '최근 수행한 운동이 아직 없어요.'
                  : status === 'custom'
                    ? '커스텀 운동이 없어요.'
                    : '검색 결과가 없어요.'}
          </p>
        )}
        {results.slice(0, 80).map((ex) => {
          const liked = favoriteSet.has(ex.id)
          return (
            <div key={ex.id} className="picker-row">
              <button
                type="button"
                className={`picker-heart ${liked ? 'is-on' : ''}`}
                aria-label={liked ? '즐겨찾기 해제' : '즐겨찾기'}
                onClick={(e) => {
                  e.stopPropagation()
                  void toggleFavorite(ex.id)
                }}
              >
                {liked ? '♥' : '♡'}
              </button>
              <button
                type="button"
                className="picker-row-main"
                onClick={() => onPick(ex)}
              >
                <ExercisePreview exercise={ex} media="image" />
                <div className="picker-row-text">
                  <div className="picker-row-title">{tKo(ex.name)}</div>
                  <div className="picker-row-sub muted">{muscleLine(ex)}</div>
                </div>
              </button>
              <div className="picker-more-wrap">
                <button
                  type="button"
                  className="picker-more"
                  aria-label="더보기"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuId((id) => (id === ex.id ? null : ex.id))
                  }}
                >
                  ⋯
                </button>
                {menuId === ex.id && (
                  <div className="picker-menu card stack">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ justifyContent: 'flex-start' }}
                      onClick={() => {
                        setMenuId(null)
                        onPick(ex)
                      }}
                    >
                      담기
                    </button>
                    {ex.source === 'custom' && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ justifyContent: 'flex-start', color: 'var(--danger)' }}
                        onClick={() => {
                          setMenuId(null)
                          void removeCustomExercise(ex.id)
                        }}
                      >
                        커스텀 삭제
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showTop && (
        <button
          type="button"
          className="picker-scroll-top"
          aria-label="맨 위로"
          onClick={() => listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑
        </button>
      )}
    </div>
  )
}
