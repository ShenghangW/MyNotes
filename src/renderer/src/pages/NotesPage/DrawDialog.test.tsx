import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import DrawDialog from './DrawDialog'

// jsdom has no canvas, so give it just enough of a 2D context to draw into.
function fakeContext(): Partial<CanvasRenderingContext2D> {
  return {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    drawImage: vi.fn()
  }
}

function pointer(
  target: Element,
  type: 'pointerDown' | 'pointerMove' | 'pointerUp',
  x: number,
  y: number,
  pointerType = 'mouse'
): void {
  fireEvent[type](target, {
    clientX: x,
    clientY: y,
    pointerId: 1,
    pointerType,
    button: 0,
    pressure: 0.5
  })
}

// jsdom has no PointerEvent, so events would arrive without coordinates or pointer type.
class FakePointerEvent extends MouseEvent {
  pointerId: number
  pointerType: string
  pressure: number
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 0
    this.pointerType = init.pointerType ?? 'mouse'
    this.pressure = init.pressure ?? 0
  }
}

describe('DrawDialog', () => {
  beforeAll(() => {
    vi.stubGlobal('PointerEvent', FakePointerEvent)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => fakeContext() as unknown as CanvasRenderingContext2D
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
      callback(new Blob(['png'], { type: 'image/png' }))
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1200,
      height: 600,
      right: 1200,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    })
  })

  it('starts empty: nothing to insert, undo or clear', () => {
    render(<DrawDialog onCancel={() => undefined} onInsert={async () => undefined} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Insert drawing' }) as HTMLButtonElement).disabled
    ).toBe(true)
    expect((screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Clear' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('draws with a mouse, then inserts a cropped PNG', async () => {
    const onInsert = vi.fn(async () => undefined)
    render(<DrawDialog onCancel={() => undefined} onInsert={onInsert} />)
    const canvas = screen.getByLabelText('Drawing area')

    pointer(canvas, 'pointerDown', 100, 100)
    pointer(canvas, 'pointerMove', 200, 150)
    pointer(canvas, 'pointerUp', 200, 150)

    const insert = screen.getByRole('button', { name: 'Insert drawing' }) as HTMLButtonElement
    expect(insert.disabled).toBe(false)
    fireEvent.click(insert)

    await waitFor(() => expect(onInsert).toHaveBeenCalledTimes(1))
    const drawing = (
      onInsert.mock.calls[0] as unknown as [{ blob: Blob; width: number; height: number }]
    )[0]
    expect(drawing.blob.type).toBe('image/png')
    expect(drawing.width).toBeGreaterThan(100)
    expect(drawing.width).toBeLessThan(400)
    expect(drawing.height).toBeLessThan(250)
  })

  it('also draws with touch and pen input', () => {
    render(<DrawDialog onCancel={() => undefined} onInsert={async () => undefined} />)
    const canvas = screen.getByLabelText('Drawing area')

    pointer(canvas, 'pointerDown', 50, 50, 'touch')
    pointer(canvas, 'pointerUp', 50, 50, 'touch')
    expect((screen.getByRole('button', { name: 'Clear' }) as HTMLButtonElement).disabled).toBe(
      false
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    pointer(canvas, 'pointerDown', 60, 60, 'pen')
    pointer(canvas, 'pointerUp', 60, 60, 'pen')
    expect((screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('undo removes the last stroke and clear removes everything', () => {
    render(<DrawDialog onCancel={() => undefined} onInsert={async () => undefined} />)
    const canvas = screen.getByLabelText('Drawing area')
    const insert = screen.getByRole('button', { name: 'Insert drawing' }) as HTMLButtonElement

    pointer(canvas, 'pointerDown', 10, 10)
    pointer(canvas, 'pointerUp', 10, 10)
    pointer(canvas, 'pointerDown', 300, 300)
    pointer(canvas, 'pointerUp', 300, 300)
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(insert.disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(insert.disabled).toBe(true)

    pointer(canvas, 'pointerDown', 10, 10)
    pointer(canvas, 'pointerUp', 10, 10)
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(insert.disabled).toBe(true)
  })

  it('shows an error and stays open when inserting fails', async () => {
    render(
      <DrawDialog
        onCancel={() => undefined}
        onInsert={async () => {
          throw new Error('Disk is full')
        }}
      />
    )
    const canvas = screen.getByLabelText('Drawing area')
    pointer(canvas, 'pointerDown', 10, 10)
    pointer(canvas, 'pointerUp', 10, 10)
    fireEvent.click(screen.getByRole('button', { name: 'Insert drawing' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Disk is full')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('closes with Cancel or Escape without inserting', () => {
    const onCancel = vi.fn()
    const onInsert = vi.fn(async () => undefined)
    render(<DrawDialog onCancel={onCancel} onInsert={onInsert} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onInsert).not.toHaveBeenCalled()
  })
})
