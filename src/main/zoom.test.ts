// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { computeZoomFactor, nextUserZoom } from './zoom'

describe('computeZoomFactor', () => {
  it('stays at 100% for the default and smaller windows', () => {
    expect(computeZoomFactor(1100, 720)).toBe(1)
    expect(computeZoomFactor(800, 560)).toBe(1)
  })

  it('scales up with a maximised large window', () => {
    expect(computeZoomFactor(2560, 1440)).toBe(1.8)
    expect(computeZoomFactor(1920, 1080)).toBe(1.35)
  })

  it('is limited by the tighter of width and height, and capped', () => {
    expect(computeZoomFactor(2800, 800)).toBe(1)
    expect(computeZoomFactor(9000, 9000)).toBe(2.5)
  })

  it('multiplies in the user zoom within limits', () => {
    expect(computeZoomFactor(1400, 800, 1.2)).toBe(1.2)
    expect(computeZoomFactor(1400, 800, 99)).toBe(2)
  })
})

describe('nextUserZoom', () => {
  it('steps up, down, and resets', () => {
    expect(nextUserZoom(1, '=')).toBe(1.1)
    expect(nextUserZoom(1, '+')).toBe(1.1)
    expect(nextUserZoom(1, '-')).toBe(0.9)
    expect(nextUserZoom(1.4, '0')).toBe(1)
    expect(nextUserZoom(1, 'a')).toBeNull()
  })

  it('stops at the limits', () => {
    expect(nextUserZoom(2, '=')).toBe(2)
    expect(nextUserZoom(0.6, '-')).toBe(0.6)
  })
})
