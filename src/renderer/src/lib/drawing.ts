/** Pure helpers for the note drawing pad (kept free of React so they are easy to test). */
export type Point = { x: number; y: number; /** line width at this point */ w: number }
export type Stroke = { points: Point[]; color: string; erase: boolean }

export const PAPER_COLOR = '#ffffff'
export const EXPORT_PADDING = 24

/** Pens respond to pressure; a mouse or a finger draws a steady line. */
export function widthFor(size: number, pointerType: string, pressure: number): number {
  if (pointerType === 'pen' && pressure > 0) {
    return size * (0.4 + pressure * 1.2)
  }
  return size
}

/** The area covered by the visible ink (erasing doesn't count), or null if nothing is drawn. */
export function inkBounds(
  strokes: Stroke[],
  padding = EXPORT_PADDING
): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const stroke of strokes) {
    if (stroke.erase) {
      continue
    }
    for (const point of stroke.points) {
      const half = point.w / 2
      minX = Math.min(minX, point.x - half)
      minY = Math.min(minY, point.y - half)
      maxX = Math.max(maxX, point.x + half)
      maxY = Math.max(maxY, point.y + half)
    }
  }
  if (minX === Infinity) {
    return null
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2
  }
}

export function hasInk(strokes: Stroke[]): boolean {
  return strokes.some((stroke) => !stroke.erase && stroke.points.length > 0)
}

/** Draws the part of a stroke from point `from` onwards (so live drawing only adds new bits). */
export function drawStrokeFrom(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  from: number
): void {
  const color = stroke.erase ? PAPER_COLOR : stroke.color
  context.strokeStyle = color
  context.fillStyle = color
  context.lineCap = 'round'
  context.lineJoin = 'round'

  const { points } = stroke
  if (points.length === 1 && from === 0) {
    context.beginPath()
    context.arc(points[0].x, points[0].y, points[0].w / 2, 0, Math.PI * 2)
    context.fill()
    return
  }
  for (let index = Math.max(1, from); index < points.length; index += 1) {
    const previous = points[index - 1]
    const point = points[index]
    context.lineWidth = point.w
    context.beginPath()
    context.moveTo(previous.x, previous.y)
    context.lineTo(point.x, point.y)
    context.stroke()
  }
}

export function paintAll(
  context: CanvasRenderingContext2D,
  strokes: Stroke[],
  width: number,
  height: number
): void {
  context.fillStyle = PAPER_COLOR
  context.fillRect(0, 0, width, height)
  strokes.forEach((stroke) => drawStrokeFrom(context, stroke, 0))
}
