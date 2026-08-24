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

  it('never ships a dead r2.dev media URL (the CDN went 401)', () => {
    const catalog = loadCatalog()
    for (const ex of catalog) {
      const urls = [
        ex.thumbnails?.male,
        ex.thumbnails?.female,
        ex.videos?.male,
        ex.videos?.female,
      ].filter(Boolean) as string[]
      for (const url of urls) {
        expect(url).not.toContain('r2.dev')
      }
    }
  })

  it('repoints matched exercises to stable free-exercise-db photos with two demo frames', () => {
    const catalog = loadCatalog()
    // Barbell Curl (0031) has a verified yuhonas override.
    const curl = catalog.find((e) => e.id === '0031')
    expect(curl?.thumbnails.male).toContain('raw.githubusercontent.com/yuhonas')
    // Two frames (start/end) drive the crossfade demo.
    expect(curl?.frames).toHaveLength(2)
    expect(curl?.frames?.[0]).toContain('raw.githubusercontent.com/yuhonas')
    // yuhonas has stills only — the dead video URL must be gone.
    expect(curl?.videos.male).toBeUndefined()
  })
})
