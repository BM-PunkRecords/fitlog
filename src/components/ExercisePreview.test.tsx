import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Exercise } from '../catalog/types'
import { ExercisePreview } from './ExercisePreview'

afterEach(cleanup)

const base: Exercise = {
  id: 'x',
  name: 'Barbell Curl',
  bodyPart: 'upper arms',
  target: 'biceps',
  secondaryMuscles: [],
  equipment: 'barbell',
  difficulty: 'beginner',
  steps: [],
  formCues: [],
  commonMistakes: [],
  videos: {},
  thumbnails: {},
}

describe('ExercisePreview', () => {
  it('plays a two-frame crossfade demo when frames are present', () => {
    const { container } = render(
      <ExercisePreview
        exercise={{ ...base, frames: ['a.jpg', 'b.jpg'], thumbnails: { male: 'a.jpg' } }}
      />,
    )
    const imgs = container.querySelectorAll('.exercise-frames img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]).toHaveAttribute('src', 'a.jpg')
    expect(imgs[1]).toHaveAttribute('src', 'b.jpg')
    // The top frame is the one that animates.
    expect(container.querySelector('.exercise-frames-top')).toHaveAttribute('src', 'b.jpg')
  })

  it('shows the dumbbell placeholder when there is no media', () => {
    const { container } = render(<ExercisePreview exercise={base} />)
    expect(container.querySelector('.thumb-placeholder')).not.toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('falls back to a plain image when only a thumbnail exists', () => {
    const { container } = render(
      <ExercisePreview exercise={{ ...base, thumbnails: { male: 'poster.jpg' } }} media="image" />,
    )
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'poster.jpg')
    expect(container.querySelector('.exercise-frames')).toBeNull()
  })
})
