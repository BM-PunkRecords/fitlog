import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Small, semantic, reusable app primitives for FitLog's mobile screens.
 *
 * These exist only to remove duplicated markup/styles across Home, History,
 * Stats and Settings — they are plain native HTML (`<header>`, `<h1>`/`<h2>`,
 * `<section>`, `<a>`) styled with FitLog's tokens + SEED foundation spacing.
 * Deliberately *not* a component framework and no `@seed-design/react` barrel.
 */

/** Page-level `<header>`: one `<h1>` plus optional supporting line. */
export function PageHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <header className="page-header">
      <h1 className="page-title">{title}</h1>
      {description ? <p className="page-header-desc">{description}</p> : null}
    </header>
  )
}

/** Section `<h2>` with an optional muted aside (e.g. a count). */
export function SectionHeader({ title, aside }: { title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {aside != null ? <span className="section-aside muted">{aside}</span> : null}
    </div>
  )
}

/** Calm empty state: title, optional description and a next-action slot. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-desc muted">{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  )
}

/** Compact metric: small label above a large tabular number. */
export function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: ReactNode
  value: ReactNode
  tone?: 'default' | 'brand'
}) {
  return (
    <div className="stat">
      <span className="stat-label muted">{label}</span>
      <span className={`stat-number${tone === 'brand' ? ' stat-number-brand' : ''}`}>{value}</span>
    </div>
  )
}

/**
 * Tappable list surface that navigates. Renders a real `<a>` (via router
 * `Link`) with a restrained directional chevron, so it stays keyboard
 * accessible with a visible focus ring. Used by routine and session lists.
 */
export function NavCard({
  to,
  children,
  ariaLabel,
}: {
  to: string
  children: ReactNode
  ariaLabel?: string
}) {
  return (
    <Link to={to} className="nav-card interactive" aria-label={ariaLabel}>
      <span className="nav-card-body">{children}</span>
      <span className="nav-card-chevron" aria-hidden="true">
        ›
      </span>
    </Link>
  )
}
