import { Link } from 'react-router-dom'
import { RestField } from '../components/RestField'
import { useAppData } from '../context/AppDataContext'
import { clampRest, formatRest } from '../lib/rest'

export function SettingsPage() {
  const { settings, setSettings } = useAppData()

  const setDefaultRest = (seconds: number) => {
    void setSettings({ ...settings, defaultRestSeconds: clampRest(seconds) })
  }

  return (
    <div className="stack page-enter">
      <Link to="/" className="muted interactive">
        ← 홈
      </Link>
      <h1 className="page-title">설정</h1>
      <div className="card stack">
        <RestField
          label="기본 휴식 시간"
          seconds={settings.defaultRestSeconds}
          onChange={setDefaultRest}
        />
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          새 운동과 루틴에 기본으로 적용돼요. 지금은 {formatRest(settings.defaultRestSeconds)}.
        </p>
      </div>
    </div>
  )
}
