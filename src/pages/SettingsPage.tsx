import { Link } from 'react-router-dom'
import { RestField } from '../components/RestField'
import { PageHeader, SectionHeader } from '../components/primitives'
import { useAppData } from '../context/AppDataContext'
import { clampRest, formatRest } from '../lib/rest'
import { selectAllProps } from '../lib/selectOnFocus'

export function SettingsPage() {
  const { settings, setSettings } = useAppData()

  const setDefaultRest = (seconds: number) => {
    void setSettings({ ...settings, defaultRestSeconds: clampRest(seconds) })
  }

  // 빈 칸은 "모름"이다 — 0으로 저장하면 칼로리가 0kcal로 계산돼 버린다.
  const setBodyWeight = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      void setSettings({ ...settings, bodyWeightKg: undefined })
      return
    }
    const n = Number(trimmed)
    if (!Number.isFinite(n) || n <= 0) return
    void setSettings({ ...settings, bodyWeightKg: Math.min(300, Math.max(20, n)) })
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

      <section className="stack">
        <SectionHeader title="체중" />
        <div className="card stack">
          <label className="stack" style={{ gap: 8 }}>
            <span className="card-title">체중 (kg)</span>
            <input
              className="field"
              type="number"
              inputMode="decimal"
              min={20}
              max={300}
              step={0.1}
              value={settings.bodyWeightKg ?? ''}
              placeholder="예: 70"
              onChange={(e) => setBodyWeight(e.target.value)}
              {...selectAllProps}
              aria-label="체중(kg)"
            />
          </label>
          {/* 없는 값으로 숫자를 만들지 않는다 — 체중을 모르면 칼로리를 아예 숨긴다. */}
          <p className="card-meta" style={{ margin: 0 }}>
            {settings.bodyWeightKg
              ? '기록에 소모 칼로리(추정)가 함께 표시돼요. 실제 소모량은 강도·체성분에 따라 달라져요.'
              : '입력하면 기록에 소모 칼로리를 추정해 보여줘요. 비워 두면 표시하지 않아요.'}
          </p>
        </div>
      </section>
    </div>
  )
}
