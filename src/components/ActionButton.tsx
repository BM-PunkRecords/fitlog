import { cloneElement, isValidElement } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, ReactElement } from 'react'

/**
 * FitLog ActionButton — semantic app code styled with SEED Design's official
 * `action-button` recipe CSS (`@seed-design/css/recipes/action-button.css`).
 *
 * Rather than pulling the `@seed-design/react` runtime (a broad barrel that
 * ballooned FitLog's initial JS), this maps the documented recipe props to the
 * recipe's own class names and renders a native `<button>` — or, with
 * `asChild`, forwards the classes onto a single child element (e.g. a React
 * Router `<Link>`) so navigation keeps real anchor semantics. Interaction
 * states (hover/active/focus-visible/disabled) come straight from the recipe's
 * native pseudo-class selectors, so no JS state tracking is needed.
 */
export type ActionButtonVariant =
  | 'brandSolid'
  | 'neutralSolid'
  | 'neutralWeak'
  | 'criticalSolid'
  | 'brandOutline'
  | 'neutralOutline'
  | 'ghost'

export type ActionButtonSize = 'xsmall' | 'small' | 'medium' | 'large'

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionButtonVariant
  size?: ActionButtonSize
  /** Grow to fill the flex container (recipe's `--seed-box-flex-grow`). */
  flexGrow?: boolean
  /** Render the recipe styles on the single child element instead of a button. */
  asChild?: boolean
}

export function ActionButton({
  variant = 'neutralWeak',
  size = 'medium',
  flexGrow = false,
  asChild = false,
  className,
  style,
  children,
  type,
  ...rest
}: ActionButtonProps) {
  const recipeClassName = [
    'seed-action-button',
    `seed-action-button--variant_${variant}`,
    `seed-action-button--size_${size}`,
    'seed-action-button--layout_withText',
    `seed-action-button--size_${size}-layout_withText`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const mergedStyle: CSSProperties | undefined = flexGrow
    ? ({ ...style, '--seed-box-flex-grow': '1' } as CSSProperties)
    : style

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string; style?: CSSProperties }>
    return cloneElement(child, {
      className: [recipeClassName, child.props.className].filter(Boolean).join(' '),
      style: { ...mergedStyle, ...child.props.style },
    })
  }

  return (
    <button type={type ?? 'button'} className={recipeClassName} style={mergedStyle} {...rest}>
      {children}
    </button>
  )
}
