import { useState } from 'react'
import type { Exercise } from '../catalog/types'

interface Props {
  exercise: Exercise
  onClose: () => void
}

export function ExerciseInfoSheet({ exercise, onClose }: Props) {
  const [videoFailed, setVideoFailed] = useState(false)
  const videoUrl = exercise.videos.male ?? exercise.videos.female
  const thumb = exercise.thumbnails.male ?? exercise.thumbnails.female

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet stack"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${exercise.name} 정보`}
      >
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>{exercise.name}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            닫기
          </button>
        </div>
        {!videoFailed && videoUrl ? (
          <video
            key={videoUrl}
            src={videoUrl}
            controls
            playsInline
            poster={thumb}
            style={{ width: '100%', borderRadius: 12, background: '#000' }}
            onError={() => setVideoFailed(true)}
          />
        ) : (
          thumb && (
            <img
              src={thumb}
              alt=""
              style={{ width: '100%', borderRadius: 12 }}
            />
          )
        )}
        {exercise.shortDescription && <p className="muted">{exercise.shortDescription}</p>}
        <section className="stack">
          <strong>단계</strong>
          <ol>
            {exercise.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        <section className="stack">
          <strong>폼 큐</strong>
          <ul>
            {exercise.formCues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
        <section className="stack">
          <strong>흔한 실수</strong>
          <ul>
            {exercise.commonMistakes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
        {exercise.breathing && (
          <p>
            <strong>호흡</strong> · {exercise.breathing}
          </p>
        )}
      </div>
    </div>
  )
}
