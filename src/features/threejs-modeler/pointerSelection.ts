type PointerPoint = {
  x: number
  y: number
}

const selectionClickThreshold = 5

export function isSelectionClick(start: PointerPoint, end: PointerPoint) {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y

  return Math.hypot(deltaX, deltaY) <= selectionClickThreshold
}
