import { useState } from 'react'
import type { Exercise } from '../catalog/types'

interface Props {
  exercise: Exercise
  className?: string
  size?: 'thumb' | 'hero'
  /** Lists should use image to avoid video layering bugs on mobile */
  media?: 'auto' | 'image'
}

export function ExercisePreview({
  exercise,
  className = '',
  size = 'thumb',
  media = 'auto',
}: Props) {
  const [failed, setFailed] = useState(false)
  const videoUrl = exercise.videos.male ?? exercise.videos.female
  const poster = exercise.thumbnails.male ?? exercise.thumbnails.female
  const dim = size === 'hero' ? 120 : 52
  const useVideo = media === 'auto' && !failed && Boolean(videoUrl)

  if (useVideo && videoUrl) {
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
        style={{ width: dim, height: dim, objectFit: 'cover' }}
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
      loading="lazy"
      style={{ width: dim, height: dim, objectFit: 'cover' }}
    />
  ) : (
    <div className={`thumb ${className}`.trim()} style={{ width: dim, height: dim }} />
  )
}
