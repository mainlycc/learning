import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn (className utility)', () => {
  it('should merge class names correctly', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base', isActive && 'active')
    expect(result).toBe('base active')
  })

  it('should filter out falsy values', () => {
    const result = cn('base', false, null, undefined, 'end')
    expect(result).toBe('base end')
  })

  it('should merge Tailwind classes correctly', () => {
    // tailwind-merge removes conflicting classes
    const result = cn('px-4 py-2', 'px-6')
    expect(result).toBe('py-2 px-6')
  })

  it('should handle object syntax', () => {
    const result = cn({
      'base-class': true,
      'hidden-class': false,
      'visible-class': true,
    })
    expect(result).toBe('base-class visible-class')
  })

  it('should handle array syntax', () => {
    const result = cn(['class1', 'class2'])
    expect(result).toBe('class1 class2')
  })

  it('should return empty string for no arguments', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should merge conflicting Tailwind colors', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('should keep non-conflicting Tailwind classes', () => {
    const result = cn('bg-red-500', 'text-blue-500', 'p-4')
    expect(result).toBe('bg-red-500 text-blue-500 p-4')
  })
})
