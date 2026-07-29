import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { PreviousRecordDisclosure } from './PreviousRecord'
import type { PreviousRecord } from '../lib/previousRecord'

afterEach(cleanup)

const record: PreviousRecord = {
  date: '2026-07-27T10:00:00.000Z',
  metricType: 'weight_reps',
  sets: [
    { setNumber: 1, weightKg: 60, reps: 8, completed: true },
    { setNumber: 2, weightKg: 0, reps: 12, completed: true },
  ],
}

const rowingRecord: PreviousRecord = {
  date: '2026-07-27T10:00:00.000Z',
  metricType: 'duration_distance',
  sets: [
    { setNumber: 1, weightKg: 0, reps: 0, durationSec: 1230, distanceKm: 5, completed: true },
  ],
}

describe('PreviousRecordDisclosure', () => {
  it('toggles the panel and exposes aria-expanded', async () => {
    const user = userEvent.setup()
    render(<PreviousRecordDisclosure record={record} />)
    const toggle = screen.getByRole('button', { name: /이전 기록/ })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('60 kg × 8회')).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('60 kg × 8회')).toBeInTheDocument()
    expect(screen.getByText('맨몸 × 12회')).toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('60 kg × 8회')).not.toBeInTheDocument()
  })

  it('formats historical sets using the previous exercise metric type', async () => {
    const user = userEvent.setup()
    render(<PreviousRecordDisclosure record={rowingRecord} />)
    await user.click(screen.getByRole('button', { name: /이전 기록/ }))
    expect(screen.getByText('20:30 · 5 km')).toBeInTheDocument()
  })

  it('shows a concise empty state when there is no record', async () => {
    const user = userEvent.setup()
    render(<PreviousRecordDisclosure record={null} />)
    await user.click(screen.getByRole('button', { name: /이전 기록/ }))
    expect(screen.getByText('이전 완료 기록이 없어요.')).toBeInTheDocument()
  })

  it('shows a loading state without blocking the toggle', async () => {
    const user = userEvent.setup()
    render(<PreviousRecordDisclosure record={null} loading />)
    await user.click(screen.getByRole('button', { name: /이전 기록/ }))
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })
})
