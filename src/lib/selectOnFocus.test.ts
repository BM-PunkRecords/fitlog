import { describe, expect, it, vi } from 'vitest'
import { selectAll, selectInputValue } from './selectOnFocus'

describe('selectInputValue', () => {
  it('selects the full value of a text input', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.value = '20:30'
    document.body.appendChild(input)
    selectInputValue(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(5)
    input.remove()
  })

  it('does nothing for an empty input', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.value = ''
    const spy = vi.spyOn(input, 'select')
    selectInputValue(input)
    expect(spy).not.toHaveBeenCalled()
  })

  it('tolerates engines that reject selection', () => {
    const input = document.createElement('input')
    input.value = '5'
    vi.spyOn(input, 'select').mockImplementation(() => {
      throw new Error('unsupported')
    })
    expect(() => selectInputValue(input)).not.toThrow()
  })
})

describe('selectAll', () => {
  it('selects the current target value on focus/click', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.value = '42'
    document.body.appendChild(input)
    selectAll({ currentTarget: input })
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(2)
    input.remove()
  })
})
