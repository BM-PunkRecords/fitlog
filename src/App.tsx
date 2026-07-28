import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { AppDataProvider } from './context/AppDataContext'
import { HomePage } from './pages/HomePage'
import { HistoryPage, SessionDetailPage, StatsPage } from './pages/HistoryStatsPages'
import { RoutineDetailPage, RoutineEditPage } from './pages/RoutinePages'
import { SessionPage } from './pages/SessionPage'
import './styles/global.css'

export default function App() {
  return (
    <AppDataProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/routines/new" element={<RoutineEditPage />} />
            <Route path="/routines/:id" element={<RoutineDetailPage />} />
            <Route path="/routines/:id/edit" element={<RoutineEditPage />} />
            <Route path="/session/:id" element={<SessionPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:id" element={<SessionDetailPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </BrowserRouter>
    </AppDataProvider>
  )
}
