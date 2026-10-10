import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@renderer/lib/cn'
import {
  drawStrokeFrom,
  hasInk,
  inkBounds,
  paintAll,
  widthFor,
  type Stroke
} from '@renderer/lib/drawing'

/** Logical drawing area. The canvas is scaled to fit the dialog, so coordinates stay stable. */
const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 600

const COLORS = [
  { name: 'Black', value: '#111111' },
  { name: 'Blue', value: '#1d4ed8' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Green', value: '#15803d' }
]
const SIZES = [
  { name: 'Thin', value: 3 },
  { name: 'Medium', value: 6 },
  { name: 'Thick', value: 12 }
]
const ERASER_FACTOR = 4

export type DrawingResult = { blob: Blob; width: number; height: number }

type DrawDialogProps = {
  onCancel: () => void
  /** Resolves when the drawing has been added to the note; rejects with a message to show. */
  onInsert: (drawing: DrawingResult) => Promise<void>
}

export default function DrawDialog({ onCancel, onInsert }: DrawDialogProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const activeRef = useRef<{ stroke: Stroke; pointerId: number } | null>(null)
  const [color, setColor] = useState(COLORS[0].value)
  const [size, setSize] = useState(SIZES[1].value)
  const [erasing, setErasing] = useState(false)
  const [inked, setInked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const context = (): CanvasRenderingContext2D | null => canvasRef.current?.getContext('2d') ?? null

  const repaint = useCallback((): void => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      paintAll(ctx, strokesRef.current, CANVAS_WIDTH, CANVAS_HEIGHT)
    }
    setInked(hasInk(strokesRef.current))
  }, [])

  useEffect(() => {
    repaint()
  }, [repaint])

  const undo = useCallback((): void => {
    strokesRef.current = strokesRef.current.slice(0, -1)
    repaint()
  }, [repaint])

  const clear = (): void => {
    strokesRef.current = []
    repaint()
  }

  // Esc closes the pad; Ctrl/Cmd+Z undoes the last stroke.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !busy) {
        onCancel()
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel, undo])

  const toCanvasPoint = (
    event: React.PointerEvent<HTMLCanvasElement>,
    source = event
  ): {
    x: number
    y: number
    w: number
  } => {
    const rect = event.currentTarget.getBoundingClientRect()
    const scale = rect.width > 0 ? CANVAS_WIDTH / rect.width : 1
    const lineSize = erasing ? size * ERASER_FACTOR : size
    return {
      x: (source.clientX - rect.left) * scale,
      y: (source.clientY - rect.top) * scale,
      w: widthFor(lineSize, event.pointerType, source.pressure)
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    // Only the main button / a touch / a pen; ignore a second finger while drawing.
    if (busy || activeRef.current || (event.pointerType === 'mouse' && event.button !== 0)) {
      return
    }
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const stroke: Stroke = { points: [toCanvasPoint(event)], color, erase: erasing }
    activeRef.current = { stroke, pointerId: event.pointerId }
    strokesRef.current = [...strokesRef.current, stroke]
    const ctx = context()
    if (ctx) {
      drawStrokeFrom(ctx, stroke, 0)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const active = activeRef.current
    if (!active || active.pointerId !== event.pointerId) {
      return
    }
    event.preventDefault()
    const native = event.nativeEvent
    const samples =
      typeof native.getCoalescedEvents === 'function' && native.getCoalescedEvents().length > 0
        ? native.getCoalescedEvents()
        : [native]
    const from = active.stroke.points.length
    for (const sample of samples) {
      active.stroke.points.push(toCanvasPoint(event, sample as unknown as typeof event))
    }
    const ctx = context()
    if (ctx) {
      drawStrokeFrom(ctx, active.stroke, from)
    }
  }

  const endStroke = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (activeRef.current?.pointerId === event.pointerId) {
      activeRef.current = null
      setInked(hasInk(strokesRef.current))
    }
  }

  const exportDrawing = (): Promise<DrawingResult> => {
    const canvas = canvasRef.current
    const bounds = inkBounds(strokesRef.current)
    if (!canvas || !bounds) {
      return Promise.reject(new Error('Draw something first.'))
    }
    // Crop to the ink so a signature or an equation doesn't come with a big white page.
    const x = Math.max(0, Math.floor(bounds.x))
    const y = Math.max(0, Math.floor(bounds.y))
    const width = Math.min(CANVAS_WIDTH - x, Math.ceil(bounds.width))
    const height = Math.min(CANVAS_HEIGHT - y, Math.ceil(bounds.height))
    const out = document.createElement('canvas')
    out.width = width
    out.height = height
    const outContext = out.getContext('2d')
    if (!outContext) {
      return Promise.reject(new Error('Drawing is not available here.'))
    }
    outContext.drawImage(canvas, x, y, width, height, 0, 0, width, height)
    return new Promise((resolve, reject) => {
      out.toBlob((blob) => {
        if (blob) {
          resolve({ blob, width, height })
        } else {
          reject(new Error('The drawing could not be saved.'))
        }
      }, 'image/png')
    })
  }

  const handleInsert = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await onInsert(await exportDrawing())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setBusy(false)
    }
  }

  const toolButton = (active: boolean): string =>
    cn(
      'h-8 rounded-sm border px-2.5 text-sm disabled:opacity-50',
      active
        ? 'border-accent bg-hover font-medium text-text'
        : 'border-border text-text-muted hover:bg-hover hover:text-text'
    )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="draw-dialog-heading"
        className="flex max-h-full w-full max-w-[960px] flex-col gap-3 overflow-auto rounded-md border border-border bg-surface p-4"
      >
        <div className="flex items-center justify-between">
          <h2 id="draw-dialog-heading" className="text-base font-medium text-text">
            Draw
          </h2>
          <p className="text-xs text-text-muted">Use your mouse, finger or pen.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Colour" className="flex gap-1.5">
            {COLORS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-label={item.name}
                aria-pressed={!erasing && color === item.value}
                className={cn(
                  'h-8 w-8 rounded-full border-2',
                  !erasing && color === item.value ? 'border-accent' : 'border-border'
                )}
                style={{ backgroundColor: item.value }}
                onClick={() => {
                  setColor(item.value)
                  setErasing(false)
                }}
              />
            ))}
          </div>
          <div role="group" aria-label="Thickness" className="flex gap-1.5">
            {SIZES.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={size === item.value}
                className={toolButton(size === item.value)}
                onClick={() => setSize(item.value)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={erasing}
            className={toolButton(erasing)}
            onClick={() => setErasing((value) => !value)}
          >
            Eraser
          </button>
          <button type="button" className={toolButton(false)} disabled={!inked} onClick={undo}>
            Undo
          </button>
          <button type="button" className={toolButton(false)} disabled={!inked} onClick={clear}>
            Clear
          </button>
        </div>

        <canvas
          ref={canvasRef}
          aria-label="Drawing area"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full cursor-crosshair rounded-sm border border-border bg-white"
          style={{ touchAction: 'none', aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />

        {error ? (
          <p className="text-sm text-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button type="button" className={toolButton(false)} disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="h-8 rounded-sm bg-accent px-4 text-sm text-on-accent hover:opacity-90 disabled:opacity-50"
            disabled={!inked || busy}
            onClick={() => void handleInsert()}
          >
            {busy ? 'Inserting…' : 'Insert drawing'}
          </button>
        </div>
      </div>
    </div>
  )
}
