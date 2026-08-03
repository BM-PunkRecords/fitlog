import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BottomAdBanner } from './components/BottomAdBanner'
import { BottomChrome } from './components/BottomChrome'
import { BottomNav } from './components/BottomNav'
import { StartupSplash } from './components/StartupSplash'
import { AppDataProvider, useAppData } from './context/AppDataContext'
import { ChallengeListPage, ChallengePlayPage } from './pages/ChallengePages'
import { HomePage } from './pages/HomePage'
import { RecommendedRoutinePage } from './pages/RecommendedRoutinePage'
import { HistoryPage, SessionDetailPage, StatsPage } from './pages/HistoryStatsPages'
import { RoutineDetailPage, RoutineEditPage } from './pages/RoutinePages'
import { SessionPage } from './pages/SessionPage'
import { SettingsPage } from './pages/SettingsPage'
import './styles/global.css'
import './styles/motion.css'

/**
 * App-level startup gate: until AppData has hydrated (`ready`), render only the
 * splash. Routes, bottom navigation and the ad banner mount together once ready,
 * so the fixed bottom chrome never flashes in before the app content.
 */
function AppShell() {
  const { ready } = useAppData()

  if (!ready) return <StartupSplash />

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/routines/new" element={<RoutineEditPage />} />
          <Route path="/routines/:id" element={<RoutineDetailPage />} />
          <Route path="/routines/:id/edit" element={<RoutineEditPage />} />
          <Route path="/session/:id" element={<SessionPage />} />
          <Route path="/recommended/:id" element={<RecommendedRoutinePage />} />
          <Route path="/challenges" element={<ChallengeListPage />} />
          <Route path="/challenges/:id" element={<ChallengePlayPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<SessionDetailPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomChrome>
        <BottomNav />
        <BottomAdBanner />
      </BottomChrome>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AppDataProvider>
      <AppShell />
    </AppDataProvider>
  )
}
