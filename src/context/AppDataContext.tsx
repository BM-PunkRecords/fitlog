import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadCatalog } from '../catalog/loadCatalog'
import type { Exercise } from '../catalog/types'
import { LocalWorkoutStore } from '../store/LocalWorkoutStore'
import type { WorkoutStore } from '../store/WorkoutStore'
import type { AppSettings, Routine, Session } from '../types/models'
import { DEFAULT_SETTINGS } from '../types/models'

interface AppDataValue {
  ready: boolean
  store: WorkoutStore
  catalog: Exercise[]
  settings: AppSettings
  routines: Routine[]
  inProgress: Session | undefined
  refresh: () => Promise<void>
  setSettings: (settings: AppSettings) => Promise<void>
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => new LocalWorkoutStore(), [])
  const catalog = useMemo(() => loadCatalog(), [])
  const [ready, setReady] = useState(false)
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [routines, setRoutines] = useState<Routine[]>([])
  const [inProgress, setInProgress] = useState<Session | undefined>()

  const refresh = useCallback(async () => {
    const [nextSettings, nextRoutines, nextInProgress] = await Promise.all([
      store.getSettings(),
      store.listRoutines(),
      store.getInProgressSession(),
    ])
    setSettingsState(nextSettings)
    setRoutines(nextRoutines)
    setInProgress(nextInProgress)
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

  const value = useMemo(
    () => ({
      ready,
      store,
      catalog,
      settings,
      routines,
      inProgress,
      refresh,
      setSettings,
    }),
    [ready, store, catalog, settings, routines, inProgress, refresh, setSettings],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
