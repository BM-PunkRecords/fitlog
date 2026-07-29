import { Link } from 'react-router-dom'
import { RestField } from '../components/RestField'
import { PageHeader, SectionHeader } from '../components/primitives'
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
      <PageHeader title="설정" description="FitLog를 내 운동 습관에 맞게 조정해요" />

      <section className="stack">
        <SectionHeader title="휴식 시간" />
        <div className="card stack">
          <RestField
            label="기본 휴식 시간"
            seconds={settings.defaultRestSeconds}
            onChange={setDefaultRest}
          />
          <p className="card-meta" style={{ margin: 0 }}>
            새로 만드는 운동과 루틴에 기본으로 적용돼요. 루틴이나 세션마다 따로 바꿀 수도 있어요.
            지금은 {formatRest(settings.defaultRestSeconds)}.
          </p>
        </div>
      </section>
    </div>
  )
}
