import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { customExerciseToCatalog } from '../catalog/customExercise'
import { buildExerciseIndex } from '../catalog/dedupe'
import { loadCatalogWithAliases } from '../catalog/loadCatalog'
import type { Exercise } from '../catalog/types'
import { LocalWorkoutStore } from '../store/LocalWorkoutStore'
import type { WorkoutStore } from '../store/WorkoutStore'
import type { AppSettings, CustomExercise, Routine, Session } from '../types/models'
import { DEFAULT_SETTINGS } from '../types/models'

interface AppDataValue {
  ready: boolean
  store: WorkoutStore
  catalog: Exercise[]
  /** id → 운동. 병합으로 사라진 옛 id도 포함한다. */
  exerciseById: Map<string, Exercise>
  customExercises: CustomExercise[]
  recentExerciseIds: string[]
  frequentExerciseIds: string[]
  settings: AppSettings
  routines: Routine[]
  inProgress: Session | undefined
  refresh: () => Promise<void>
  setSettings: (settings: AppSettings) => Promise<void>
  toggleFavorite: (exerciseId: string) => Promise<void>
  saveCustomExercise: (exercise: CustomExercise) => Promise<void>
  removeCustomExercise: (id: string) => Promise<void>
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => new LocalWorkoutStore(), [])
  const loaded = useMemo(() => {
    try {
      return loadCatalogWithAliases()
    } catch (err) {
      console.error('FitLog catalog load failed', err)
      return { catalog: [] as Exercise[], aliases: new Map<string, string>() }
    }
  }, [])
  const baseCatalog = loaded.catalog
  const [ready, setReady] = useState(false)
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [routines, setRoutines] = useState<Routine[]>([])
  const [inProgress, setInProgress] = useState<Session | undefined>()
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([])
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([])
  const [frequentExerciseIds, setFrequentExerciseIds] = useState<string[]>([])

  const refresh = useCallback(async () => {
    const settle = <T,>(p: Promise<T>, fallback: T, label: string) =>
      Promise.race([
        p,
        new Promise<T>((_, reject) => {
          window.setTimeout(() => reject(new Error(`${label} timeout`)), 3500)
        }),
      ]).catch((err: unknown) => {
        console.warn('FitLog refresh partial failure', label, err)
        return fallback
      })

    try {
      const [nextSettings, nextRoutines, nextInProgress, nextCustom, completed] =
        await Promise.all([
          settle(store.getSettings(), { ...DEFAULT_SETTINGS }, 'settings'),
          settle(store.listRoutines(), [], 'routines'),
          settle(store.getInProgressSession(), undefined, 'inProgress'),
          settle(store.listCustomExercises(), [] as CustomExercise[], 'custom'),
          settle(store.listSessions({ status: 'completed' }), [] as Session[], 'sessions'),
        ])
      setSettingsState({
        ...DEFAULT_SETTINGS,
        ...nextSettings,
        favoriteExerciseIds: nextSettings.favoriteExerciseIds ?? [],
      })
      setRoutines(nextRoutines)
      setInProgress(nextInProgress)
      setCustomExercises(nextCustom)

      const recent: string[] = []
      const seen = new Set<string>()
      const counts = new Map<string, number>()
      for (const session of completed) {
        for (const item of session.items) {
          counts.set(item.exerciseId, (counts.get(item.exerciseId) ?? 0) + 1)
          if (!seen.has(item.exerciseId)) {
            seen.add(item.exerciseId)
            recent.push(item.exerciseId)
          }
        }
      }
      setRecentExerciseIds(recent.slice(0, 40))
      setFrequentExerciseIds(
        [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([id]) => id)
          .slice(0, 40),
      )
    } catch (err) {
      console.error('FitLog refresh failed', err)
    } finally {
      setReady(true)
    }
  }, [store])

  useEffect(() => {
    let cancelled = false
    // IndexedDB can hang on blocked upgrades — never leave Home stuck loading
    const watchdog = window.setTimeout(() => {
      if (!cancelled) {
        console.warn('FitLog boot watchdog: forcing ready')
        setReady(true)
      }
    }, 2500)

    void refresh().finally(() => {
      window.clearTimeout(watchdog)
    })

    return () => {
      cancelled = true
      window.clearTimeout(watchdog)
    }
  }, [refresh])

  const setSettings = useCallback(
    async (next: AppSettings) => {
      await store.saveSettings(next)
      setSettingsState(next)
    },
    [store],
  )

  const toggleFavorite = useCallback(
    async (exerciseId: string) => {
      const ids = settings.favoriteExerciseIds ?? []
      const nextIds = ids.includes(exerciseId)
        ? ids.filter((id) => id !== exerciseId)
        : [...ids, exerciseId]
      const next = { ...settings, favoriteExerciseIds: nextIds }
      await store.saveSettings(next)
      setSettingsState(next)
    },
    [settings, store],
  )

  const saveCustomExercise = useCallback(
    async (exercise: CustomExercise) => {
      await store.upsertCustomExercise(exercise)
      await refresh()
    },
    [store, refresh],
  )

  const removeCustomExercise = useCallback(
    async (id: string) => {
      await store.deleteCustomExercise(id)
      await refresh()
    },
    [store, refresh],
  )

  const catalog = useMemo(() => {
    const customs = customExercises.map(customExerciseToCatalog)
    const ids = new Set(baseCatalog.map((e) => e.id))
    return [...baseCatalog, ...customs.filter((c) => !ids.has(c.id))]
  }, [baseCatalog, customExercises])

  // 화면에서 id로 운동을 찾을 때 쓰는 단일 인덱스. 중복 병합으로 사라진 옛 id도
  // 남은 운동을 가리키므로, 그 id로 저장된 루틴·기록이 계속 열린다.
  const exerciseById = useMemo(
    () => buildExerciseIndex(catalog, loaded.aliases),
    [catalog, loaded.aliases],
  )

  const value = useMemo(
    () => ({
      ready,
      store,
      catalog,
      exerciseById,
      customExercises,
      recentExerciseIds,
      frequentExerciseIds,
      settings,
      routines,
      inProgress,
      refresh,
      setSettings,
      toggleFavorite,
      saveCustomExercise,
      removeCustomExercise,
    }),
    [
      ready,
      store,
      catalog,
      exerciseById,
      customExercises,
      recentExerciseIds,
      frequentExerciseIds,
      settings,
      routines,
      inProgress,
      refresh,
      setSettings,
      toggleFavorite,
      saveCustomExercise,
      removeCustomExercise,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
