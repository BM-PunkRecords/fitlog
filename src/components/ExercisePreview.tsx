import { useState } from 'react'
import type { Exercise } from '../catalog/types'

interface Props {
  exercise: Exercise
  className?: string
  /** larger preview for session screen */
  size?: 'thumb' | 'hero'
}

export function ExercisePreview({ exercise, className = '', size = 'thumb' }: Props) {
  const [failed, setFailed] = useState(false)
  const videoUrl = exercise.videos.male ?? exercise.videos.female
  const poster = exercise.thumbnails.male ?? exercise.thumbnails.female
  const dim = size === 'hero' ? 120 : 52

  if (!failed && videoUrl) {
    return (
      <video
        key={videoUrl}
        className={`thumb exercise-preview ${className}`.trim()}
        src={videoUrl}
        poster={poster}
        muted
        playsInline
        autoPlay
        loop
        preload="metadata"
        style={{ width: dim, height: dim }}
        onError={() => setFailed(true)}
        aria-label={`${exercise.name} 시연`}
      />
    )
  }

  return poster ? (
    <img
      className={`thumb ${className}`.trim()}
      src={poster}
      alt=""
      style={{ width: dim, height: dim }}
    />
  ) : (
    <div className={`thumb ${className}`.trim()} style={{ width: dim, height: dim }} />
  )
}
