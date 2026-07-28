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
import { loadCatalog } from '../catalog/loadCatalog'
import type { Exercise } from '../catalog/types'
import { LocalWorkoutStore } from '../store/LocalWorkoutStore'
import type { WorkoutStore } from '../store/WorkoutStore'
import type { AppSettings, CustomExercise, Routine, Session } from '../types/models'
import { DEFAULT_SETTINGS } from '../types/models'

interface AppDataValue {
  ready: boolean
  store: WorkoutStore
  catalog: Exercise[]
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
  const baseCatalog = useMemo(() => loadCatalog(), [])
  const [ready, setReady] = useState(false)
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [routines, setRoutines] = useState<Routine[]>([])
  const [inProgress, setInProgress] = useState<Session | undefined>()
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([])
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([])
  const [frequentExerciseIds, setFrequentExerciseIds] = useState<string[]>([])

  const refresh = useCallback(async () => {
    const [nextSettings, nextRoutines, nextInProgress, nextCustom, completed] =
      await Promise.all([
        store.getSettings(),
        store.listRoutines(),
        store.getInProgressSession(),
        store.listCustomExercises(),
        store.listSessions({ status: 'completed' }),
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
    setReady(true)
  }, [store])

  useEffect(() => {
    void refresh()
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

  const value = useMemo(
    () => ({
      ready,
      store,
      catalog,
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
