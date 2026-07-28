import { describe, expect, it } from 'vitest'
import { bodyPartKo, equipmentKo, targetKo } from './labelsKo'

describe('labelsKo', () => {
  it('maps body parts and equipment to Korean', () => {
    expect(bodyPartKo('chest')).toBe('가슴')
    expect(equipmentKo('dumbbell')).toBe('덤벨')
    expect(targetKo('pectorals')).toBe('대흉근')
  })

  it('falls back to original when unknown', () => {
    expect(bodyPartKo('unknown-part')).toBe('unknown-part')
  })
})
