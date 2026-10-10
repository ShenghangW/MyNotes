import { describe, expect, it, vi } from 'vitest'
import { drawStrokeFrom, hasInk, inkBounds, widthFor, type Stroke } from './drawing'

const stroke = (points: Array<[number, number]>, erase = false, w = 4): Stroke => ({
  color: '#111111',
  erase,
  points: points.map(([x, y]) => ({ x, y, w }))
})

describe('drawing', () => {
  it('a pen responds to pressure; a mouse or finger draws a steady line', () => {
    expect(widthFor(6, 'mouse', 0.5)).toBe(6)
    expect(widthFor(6, 'touch', 0.9)).toBe(6)
    expect(widthFor(6, 'pen', 0.1)).toBeLessThan(widthFor(6, 'pen', 0.9))
    expect(widthFor(6, 'pen', 0)).toBe(6)
  })

  it('finds the area covered by ink, with padding', () => {
    const bounds = inkBounds(
      [
        stroke([
          [100, 50],
          [140, 90]
        ])
      ],
      10
    )
    expect(bounds).toEqual({ x: 88, y: 38, width: 64, height: 64 })
  })

  it('ignores erasing when finding the ink area', () => {
    const bounds = inkBounds(
      [
        stroke([
          [10, 10],
          [20, 20]
        ]),
        stroke([[500, 500]], true)
      ],
      0
    )
    expect(bounds?.x).toBe(8)
    expect(bounds?.width).toBeLessThan(20)
  })

  it('has no bounds and no ink when nothing visible is drawn', () => {
    expect(inkBounds([])).toBeNull()
    expect(inkBounds([stroke([[1, 1]], true)])).toBeNull()
    expect(hasInk([])).toBe(false)
    expect(hasInk([stroke([[1, 1]], true)])).toBe(false)
    expect(hasInk([stroke([[1, 1]])])).toBe(true)
  })

  it('draws a dot for a single point and segments for a line; erasing paints the paper colour', () => {
    const context = {
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn()
    } as unknown as CanvasRenderingContext2D

    drawStrokeFrom(context, stroke([[5, 5]]), 0)
    expect(context.arc).toHaveBeenCalledTimes(1)

    drawStrokeFrom(
      context,
      stroke([
        [0, 0],
        [10, 10],
        [20, 0]
      ]),
      0
    )
    expect(context.lineTo).toHaveBeenCalledTimes(2)

    drawStrokeFrom(
      context,
      stroke(
        [
          [0, 0],
          [10, 10]
        ],
        true
      ),
      0
    )
    expect(context.strokeStyle).toBe('#ffffff')
  })

  it('only draws the new part of a stroke when continuing from an index', () => {
    const context = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn()
    } as unknown as CanvasRenderingContext2D

    drawStrokeFrom(
      context,
      stroke([
        [0, 0],
        [10, 10],
        [20, 20],
        [30, 30]
      ]),
      3
    )
    expect(context.lineTo).toHaveBeenCalledTimes(1)
    expect(context.lineTo).toHaveBeenCalledWith(30, 30)
  })
})
