/**
 * Select-on-focus helpers for numeric-style inputs so tapping a field selects
 * its current value and the next keystroke replaces it (important on mobile
 * where deleting is tedious).
 *
 * `<input type="number">` rejects `setSelectionRange`/`selectionStart` in some
 * engines, so we use `select()` guarded in try/catch, and retry on the next
 * frame because iOS Safari collapses the selection made during `focus`.
 */

interface SelectableTarget {
  currentTarget: HTMLInputElement
}

/** Select the full current value of an input, tolerating engine quirks. */
export function selectInputValue(input: HTMLInputElement): void {
  if (!input.value) return
  try {
    input.select()
  } catch {
    /* number inputs on some engines reject programmatic selection */
  }
}

/** Focus/click handler that selects the whole value (retries next frame). */
export function selectAll(event: SelectableTarget): void {
  const input = event.currentTarget
  selectInputValue(input)
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => selectInputValue(input))
  }
}

/**
 * Spread onto an input to make taps/clicks/focus select the full value.
 * Keyboard interaction stays intact (we only select, never block typing).
 */
export const selectAllProps = {
  onFocus: selectAll,
  onClick: selectAll,
} as const
