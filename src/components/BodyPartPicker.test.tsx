import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BODY_REGIONS, BodyPartPicker, regionForBodyPart } from './BodyPartPicker'

afterEach(cleanup)

describe('BodyPartPicker', () => {
  it('renders one selectable card per region', () => {
    render(<BodyPartPicker value="chest" onSelect={() => {}} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(BODY_REGIONS.length)
    expect(screen.getByRole('radio', { name: '가슴' })).toHaveAttribute('aria-checked', 'true')
  })

  it('reports the picked region with its bodyPart and target', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<BodyPartPicker value="chest" onSelect={onSelect} />)

    await user.click(screen.getByRole('radio', { name: '이두(앞팔)' }))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'biceps', bodyPart: 'upper arms', target: 'biceps' }),
    )
  })

  it('maps a catalog bodyPart back to its region for preselection', () => {
    expect(regionForBodyPart('chest')?.key).toBe('chest')
    expect(regionForBodyPart('hips')?.key).toBe('glutes')
    expect(regionForBodyPart(undefined)).toBeUndefined()
  })

  it('every region uses a muscle group the map can paint (or is whole-body)', () => {
    for (const r of BODY_REGIONS) {
      expect(r.wholeBody || r.muscles.length > 0).toBe(true)
    }
  })
})
