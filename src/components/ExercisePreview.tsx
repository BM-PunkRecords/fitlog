import { useState } from 'react'
import type { Exercise } from '../catalog/types'
import { DumbbellIcon } from './icons'

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
  const [videoFailed, setVideoFailed] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const videoUrl = exercise.videos.male ?? exercise.videos.female
  const poster = exercise.thumbnails.male ?? exercise.thumbnails.female
  const dim = size === 'hero' ? 120 : 52
  const frames = exercise.frames
  const useVideo = media === 'auto' && !videoFailed && Boolean(videoUrl)

  // 시작→끝 두 프레임을 겹쳐 두고 위 프레임을 CSS로 크로스페이드해 움직임을
  // 흉내 낸다(원본 영상 CDN이 폐쇄됨). 프레임 로딩이 실패하면 아래 폴백으로 넘어간다.
  if (frames && frames.length >= 2 && !imgFailed) {
    return (
      <span
        className={`thumb exercise-frames ${className}`.trim()}
        style={{ width: dim, height: dim }}
        aria-label={`${exercise.name} 시연`}
        role="img"
      >
        <img src={frames[0]} alt="" loading="lazy" onError={() => setImgFailed(true)} />
        <img
          className="exercise-frames-top"
          src={frames[1]}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </span>
    )
  }

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
        onError={() => setVideoFailed(true)}
        aria-label={`${exercise.name} 시연`}
      />
    )
  }

  // 사진이 없거나(상위 데이터셋 CDN이 막혀 URL을 비운 경우) 불러오기에 실패하면
  // 깨진 이미지 대신 덤벨 플레이스홀더를 그린다.
  if (poster && !imgFailed) {
    return (
      <img
        className={`thumb ${className}`.trim()}
        src={poster}
        alt=""
        loading="lazy"
        style={{ width: dim, height: dim, objectFit: 'cover' }}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <div
      className={`thumb thumb-placeholder ${className}`.trim()}
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      <DumbbellIcon size={size === 'hero' ? 40 : 22} />
    </div>
  )
}
