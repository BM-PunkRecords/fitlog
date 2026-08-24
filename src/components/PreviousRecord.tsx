import { useId, useState } from 'react'
import { formatDateKey } from '../lib/format'
import { formatMetricSet } from '../lib/metrics'
import { type PreviousRecord } from '../lib/previousRecord'

interface PreviousRecordDisclosureProps {
  record: PreviousRecord | null
  loading?: boolean
  error?: boolean
}

export function PreviousRecordDisclosure({
  record,
  loading = false,
  error = false,
}: PreviousRecordDisclosureProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="prev-record">
      <button
        type="button"
        className="prev-record-toggle interactive"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>이전 기록</span>
        <span className="prev-record-caret" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div id={panelId} className="prev-record-panel stack">
          {loading ? (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              불러오는 중…
            </p>
          ) : error ? (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              이전 기록을 불러오지 못했어요.
            </p>
          ) : record ? (
            <>
              <div className="muted" style={{ fontSize: 12 }}>
                {formatDateKey(record.date)}
              </div>
              {record.sets.map((set) => (
                <div key={set.setNumber} className="prev-record-set">
                  <span className="muted">{set.setNumber}</span>
                  <span>{formatMetricSet(set, record.metricType)}</span>
                </div>
              ))}
              {/* 지난번 메모(기구 번호·자세 느낌 등)를 함께 보여준다 — 그때 무엇을
                  적어 뒀는지 다시 읽으려고 기록 화면까지 갈 필요가 없도록. */}
              {record.note && (
                <p className="prev-record-note muted">📝 {record.note}</p>
              )}
            </>
          ) : (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              이전 완료 기록이 없어요.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
