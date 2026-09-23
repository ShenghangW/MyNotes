import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins truthy class names and skips empty values', () => {
    expect(cn('px-4', false, null, undefined, 'text-sm')).toBe('px-4 text-sm')
  })
})
