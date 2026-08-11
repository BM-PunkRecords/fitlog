/**
 * 아주 단순한 세로 막대 그래프. 차트 라이브러리를 새로 얹지 않는다 — 이 앱은
 * 이미 초기 JS가 큰 PWA라, 막대 몇 개는 div 높이로 그리는 게 낫다.
 *
 * 값이 없는(전부 0) 구간도 자리는 지킨다 — 빈 날이 보여야 "며칠 쉬었나"가 읽힌다.
 */

export interface Bar {
  label: string
  value: number
  detail: string
}

interface Props {
  bars: Bar[]
  /** 값 뒤에 붙일 단위(툴팁용). 예: 'kg', '세트'. */
  unit: string
}

export function BarChart({ bars, unit }: Props) {
  const max = Math.max(1, ...bars.map((b) => b.value))
  // 막대가 많으면 x축 라벨을 솎아 겹치지 않게 한다(첫·끝은 항상).
  const step = bars.length > 10 ? Math.ceil(bars.length / 6) : 1

  return (
    <div className="barchart">
      <div className="barchart-bars">
        {bars.map((b, i) => {
          const showLabel = i % step === 0 || i === bars.length - 1
          return (
            <div
              key={`${b.label}-${i}`}
              className="barchart-col"
              title={`${b.detail} · ${b.value}${unit}`}
            >
              <div className="barchart-track">
                <span
                  className={`barchart-fill ${b.value === 0 ? 'is-empty' : ''}`}
                  style={{ height: `${(b.value / max) * 100}%` }}
                />
              </div>
              <span className="barchart-xlabel">{showLabel ? b.label : ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
