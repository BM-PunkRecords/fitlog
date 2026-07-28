import type { CSSProperties } from 'react'

const OFFSETS = [
  [-18, -22],
  [16, -20],
  [-20, 8],
  [20, 10],
  [0, -26],
  [-10, 18],
  [12, 16],
]

interface Props {
  active: boolean
}

export function CompleteBurst({ active }: Props) {
  if (!active) return null
  return (
    <span className="set-done-burst" aria-hidden>
      {OFFSETS.map(([dx, dy], i) => (
        <span
          key={i}
          style={
            {
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
              animationDelay: `${i * 0.02}s`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
}
