import { useState } from 'react'
import type { Exercise } from '../catalog/types'
import {
  bodyPartKo,
  difficultyKo,
  equipmentKo,
  targetKo,
} from '../lib/labelsKo'
import { tKo, tKoList } from '../lib/tKo'
import { Sheet } from './Sheet'

interface Props {
  exercise: Exercise
  onClose: () => void
}

export function ExerciseInfoSheet({ exercise, onClose }: Props) {
  const [videoFailed, setVideoFailed] = useState(false)
  const videoUrl = exercise.videos.male ?? exercise.videos.female
  const thumb = exercise.thumbnails.male ?? exercise.thumbnails.female
  const nameKo = tKo(exercise.name)
  const steps = tKoList(exercise.steps)
  const cues = tKoList(exercise.formCues)
  const mistakes = tKoList(exercise.commonMistakes)

  return (
    <Sheet title={nameKo} onClose={onClose}>
      {nameKo !== exercise.name && (
        <div className="muted" style={{ fontSize: 12 }}>
          {exercise.name}
        </div>
      )}
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
          <img src={thumb} alt="" style={{ width: '100%', borderRadius: 12 }} />
        )
      )}

      <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
        {bodyPartKo(exercise.bodyPart)} · {targetKo(exercise.target)} ·{' '}
        {equipmentKo(exercise.equipment)} · {difficultyKo(exercise.difficulty)}
        {exercise.secondaryMuscles?.length
          ? ` · 보조 ${exercise.secondaryMuscles.map((m) => targetKo(m)).join(', ')}`
          : ''}
      </div>

      {exercise.shortDescription && (
        <p className="muted">{tKo(exercise.shortDescription)}</p>
      )}
      <section className="stack">
        <strong>단계</strong>
        <ol>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section className="stack">
        <strong>폼 큐</strong>
        <ul>
          {cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
      <section className="stack">
        <strong>흔한 실수</strong>
        <ul>
          {mistakes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
      {exercise.breathing && (
        <p>
          <strong>호흡</strong> · {tKo(exercise.breathing)}
        </p>
      )}
    </Sheet>
  )
}
