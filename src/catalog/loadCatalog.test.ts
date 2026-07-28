import { describe, expect, it } from 'vitest'
import { loadCatalog } from './loadCatalog'

describe('loadCatalog', () => {
  it('includes Smith Machine Squat from supplement', () => {
    const catalog = loadCatalog()
    const squat = catalog.find((e) => e.name === 'Smith Machine Squat')
    expect(squat).toBeTruthy()
    expect(squat?.equipment).toBe('smith machine')
    expect(squat?.source).toBe('supplement')
  })
})
