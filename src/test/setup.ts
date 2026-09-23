import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { createMockApi } from './mockApi'

afterEach(() => {
  cleanup()
})

if (typeof window !== 'undefined') {
  window.api = createMockApi()
}
